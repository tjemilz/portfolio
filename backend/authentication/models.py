"""
Custom User model for authentication.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Extended User model with role-based permissions.
    """
    
    class UserRole(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Utilisateur Public'
        PRIVATE = 'PRIVATE', 'Utilisateur Privé'
        ADMIN = 'ADMIN', 'Administrateur'
    
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.PUBLIC
    )
    
    # Additional profile fields
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    # Invitation system
    invited_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_users'
    )
    invitation_token = models.CharField(max_length=100, blank=True, null=True)
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return self.email or self.username
    
    @property
    def is_admin_user(self):
        return self.role == self.UserRole.ADMIN or self.is_superuser
    
    @property
    def is_private_user(self):
        return self.role in [self.UserRole.PRIVATE, self.UserRole.ADMIN] or self.is_superuser
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
