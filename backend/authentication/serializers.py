"""
Serializers for authentication app.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes additional user info.
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['username'] = user.username
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user info to response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'full_name': self.user.full_name,
            'is_superuser': self.user.is_superuser,
            'is_staff': self.user.is_staff,
        }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'bio', 'avatar',
            'date_joined', 'last_login', 'is_superuser', 'is_staff'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'role', 'is_superuser', 'is_staff']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role'
        ]
    
    def validate(self, data):
        # password_confirm is optional for admin creation
        if 'password_confirm' in data and data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Les mots de passe ne correspondent pas.'
            })
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class InviteUserSerializer(serializers.Serializer):
    """Serializer for inviting new users."""
    
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['PRIVATE', 'ADMIN'], default='PRIVATE')
    message = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Un utilisateur avec cet email existe déjà.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Les nouveaux mots de passe ne correspondent pas.'
            })
        return data
