"""
Data serialization for authentication, user management, and JWT claims.
"""

import logging
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .notifications import ntfy_service

logger = logging.getLogger(__name__)
User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends standard JWT payload with custom user claims and triggers
    security notifications upon successful authentication.
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['username'] = user.username
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        request = self.context.get('request')
        if request:
            try:
                ntfy_service.notify_login_success(self.user, request)
            except Exception as e:
                logger.warning(f"Failed to dispatch login notification: {e}")
        
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'full_name': self.user.full_name,
            'is_superuser': self.user.is_superuser,
            'is_staff': self.user.is_staff,
        }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """Standard user object serializer exposing profile and group relations."""
    
    full_name = serializers.ReadOnlyField()
    access_groups = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'bio', 'avatar',
            'date_joined', 'last_login', 'is_superuser', 'is_staff',
            'access_groups'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_superuser', 'is_staff']

    def get_access_groups(self, obj):
        return [
            {'id': str(group.id), 'name': group.name}
            for group in obj.access_groups.all()
        ]


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """
    Allows administrators to manually provision a user.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role'
        ]
    
    def validate(self, data):
        if 'password_confirm' in data and data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        validate_password(data['password'])
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class InviteUserSerializer(serializers.Serializer):
    """
    Used by admins to send an invitation.
    """
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=User.UserRole.choices,
        default=User.UserRole.PRIVATE
    )
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class AcceptInvitationSerializer(serializers.Serializer):
    """
    Used by an invited recipient to accept the invitation and set their password.
    """
    invitation_token = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Used by authenticated users to update their password.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=False)
    
    def validate(self, data):
        if 'new_password_confirm' in data and data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        validate_password(data['new_password'])
        return data
