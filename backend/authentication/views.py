"""
Views for authentication app.
"""

from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    InviteUserSerializer,
    ChangePasswordSerializer
)
from .permissions import IsAdminUser

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user info with tokens."""
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """
    Logout view that blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {'message': 'Déconnexion réussie.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class RegisterView(generics.CreateAPIView):
    """
    User registration view.
    Note: Registration might be disabled in production (invite-only system).
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]


class InviteUserView(APIView):
    """
    Invite a new user (admin only).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        if serializer.is_valid():
            # TODO: Implement email invitation logic
            # For now, just create a user with a random password
            import secrets
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            
            # Generate invitation token
            invitation_token = secrets.token_urlsafe(32)
            
            # Create user with invitation
            user = User.objects.create(
                email=email,
                username=email.split('@')[0],
                role=role,
                invitation_token=invitation_token,
                invited_by=request.user,
                is_active=False  # Will be activated when accepting invitation
            )
            user.set_unusable_password()
            user.save()
            
            # TODO: Send invitation email
            
            return Response({
                'message': f'Invitation envoyée à {email}',
                'invitation_token': invitation_token  # In production, this would be sent via email
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change current user's password.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': 'Mot de passe actuel incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {'message': 'Mot de passe modifié avec succès.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """
    List all users (admin only).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get, update or delete a specific user (admin only).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Prevent changing own admin status
        if instance == request.user and 'is_superuser' in request.data:
            return Response(
                {'error': 'Vous ne pouvez pas modifier votre propre statut admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Prevent self-deletion
        if instance == request.user:
            return Response(
                {'error': 'Vous ne pouvez pas supprimer votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CreateUserView(generics.CreateAPIView):
    """
    Create a new user (admin only).
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Return user data with UserSerializer
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
