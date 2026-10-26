"""
API Endpoints for authentication, session management, and user provisioning.
Includes HttpOnly cookie support and strict administrative authorization.
"""

import logging
import secrets
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    AdminUserCreateSerializer,
    InviteUserSerializer,
    AcceptInvitationSerializer,
    ChangePasswordSerializer
)
from .permissions import IsAdminUser
from .notifications import ntfy_service

User = get_user_model()
logger = logging.getLogger(__name__)


def set_jwt_cookies(response, access_token, refresh_token=None):
    """
    Sets secure HttpOnly cookies for JWT authentication.
    - 'access_token' is scoped to '/' so it is sent on all API and media requests.
    - 'refresh_token' is scoped to '/api/auth/' to minimize attack surface.
    """
    cookie_secure = getattr(settings, 'SESSION_COOKIE_SECURE', not settings.DEBUG)
    samesite = getattr(settings, 'JWT_AUTH_SAMESITE', 'Lax')
    
    access_lifetime = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=60))
    max_age_access = int(access_lifetime.total_seconds())
    
    response.set_cookie(
        key='access_token',
        value=str(access_token),
        max_age=max_age_access,
        httponly=True,
        secure=cookie_secure,
        samesite=samesite,
        path='/'
    )
    
    if refresh_token:
        refresh_lifetime = settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME', timedelta(days=1))
        max_age_refresh = int(refresh_lifetime.total_seconds())
        response.set_cookie(
            key='refresh_token',
            value=str(refresh_token),
            max_age=max_age_refresh,
            httponly=True,
            secure=cookie_secure,
            samesite=samesite,
            path='/api/auth/'
        )


def clear_jwt_cookies(response):
    """Clears both access and refresh authentication cookies."""
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/auth/')


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Authenticates user, logs security telemetry, and sets HttpOnly JWT cookies.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        username = request.data.get('username', 'unknown')
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                access = response.data.get('access')
                refresh = response.data.get('refresh')
                set_jwt_cookies(response, access, refresh)
                ip = ntfy_service.get_client_ip(request)
                logger.warning(f"AUTH_SUCCESS: User '{username}' | IP: {ip}")
            return response
        except Exception as e:
            ip = ntfy_service.get_client_ip(request)
            logger.warning(f"AUTH_FAILED: User '{username}' | Reason: {e} | IP: {ip}")
            raise


class CookieTokenRefreshView(APIView):
    """
    Refreshes access token by reading the refresh token from HttpOnly cookie
    or request payload, then updates the authentication cookies.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            token = RefreshToken(refresh_token)
            new_access_token = str(token.access_token)
            
            # If token rotation is active, token is rotated
            if getattr(settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', True):
                token.set_jti()
                token.set_exp()
                token.set_iat()
                new_refresh_token = str(token)
            else:
                new_refresh_token = refresh_token
                
            response = Response({
                'detail': 'Token successfully refreshed.',
                'access': new_access_token
            }, status=status.HTTP_200_OK)
            
            set_jwt_cookies(response, new_access_token, new_refresh_token)
            return response
        except (InvalidToken, TokenError) as e:
            response = Response({'detail': f'Token is invalid or expired: {str(e)}'}, status=status.HTTP_401_UNAUTHORIZED)
            clear_jwt_cookies(response)
            return response


class LogoutView(APIView):
    """
    Terminates session by blacklisting refresh token and wiping HttpOnly cookies.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        response = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception as e:
                logger.warning(f"AUTH_LOGOUT_BLACKLIST_WARN: {e}")
                
        user_name = request.user.username if request.user.is_authenticated else 'Anonymous'
        ip = ntfy_service.get_client_ip(request)
        logger.warning(f"AUTH_LOGOUT: User '{user_name}' | IP: {ip}")
        
        clear_jwt_cookies(response)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieves or updates the profile of the currently authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class InviteUserView(APIView):
    """
    Provisions a new inactive user and generates an invitation token.
    Accessible only to administrators.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            
            # Non-superusers cannot create administrators
            if role == User.UserRole.ADMIN and not request.user.is_superuser:
                return Response(
                    {'error': 'Only superusers can invite administrator accounts.'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            invitation_token = secrets.token_urlsafe(32)
            username = email.split('@')[0]
            
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
                
            user = User.objects.create(
                email=email,
                username=username,
                role=role,
                invitation_token=invitation_token,
                invited_by=request.user,
                is_active=False
            )
            user.set_unusable_password()
            user.save()
            
            return Response({
                'message': f'Invitation staged for {email}',
                'invitation_token': invitation_token,
                'email': email,
                'role': role
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AcceptInvitationView(APIView):
    """
    Allows an invited user to activate their account and set their initial password.
    Logs the user in directly by setting HttpOnly JWT cookies.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = AcceptInvitationSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"ACCEPT_INVITATION_FAILED: Validation errors: {serializer.errors}")
            # Format first error message clearly for frontend
            first_err = next(iter(serializer.errors.values()))
            err_msg = first_err[0] if isinstance(first_err, list) and first_err else str(first_err)
            return Response({
                'error': err_msg,
                'detail': err_msg,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        token = serializer.validated_data['invitation_token']
        try:
            user = User.objects.get(invitation_token=token, is_active=False)
        except User.DoesNotExist:
            logger.warning(f"ACCEPT_INVITATION_FAILED: Token not found or user already active: {token[:10]}...")
            return Response(
                {
                    'error': 'Lien d\'invitation invalide ou déjà utilisé.',
                    'detail': 'Lien d\'invitation invalide ou déjà utilisé.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        password = serializer.validated_data['password']
        user.set_password(password)
        user.is_active = True
        user.invitation_token = None
        
        if serializer.validated_data.get('first_name'):
            user.first_name = serializer.validated_data['first_name']
        if serializer.validated_data.get('last_name'):
            user.last_name = serializer.validated_data['last_name']
            
        user.save()
        
        # Issue JWT tokens and set cookies
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        response = Response({
            'message': 'Account successfully activated.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
        
        set_jwt_cookies(response, access, refresh)
        return response


class ChangePasswordView(APIView):
    """Processes password updates for the authenticated user."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': 'Verification of current password failed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """Lists all registered system users (Admin only)."""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """CRUD operations for specific user records (Admin only)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prevent privilege escalation: non-superusers cannot promote anyone to superuser
        if not request.user.is_superuser:
            if request.data.get('is_superuser') or request.data.get('role') == User.UserRole.ADMIN:
                return Response(
                    {'error': 'Privilege escalation restricted to superusers.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {'error': 'Self-deletion is restricted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class CreateUserView(generics.CreateAPIView):
    """Allows administrators to manually create a user (Admin only)."""
    queryset = User.objects.all()
    serializer_class = AdminUserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
