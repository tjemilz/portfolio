"""
Core user models for authentication and access control.
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Extended user model implementing UUID primary keys and role-based hierarchy.
    Gallery access is managed via the AccessGroup relation, while 'role' defines 
    global system permissions.
    """
    
    class UserRole(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Public User'
        PRIVATE = 'PRIVATE', 'Private User'
        ADMIN = 'ADMIN', 'Administrator'
    
    # Use UUID to prevent user enumeration attacks
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.PUBLIC,
        db_index=True
    )
    
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    invited_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_users'
    )
    invitation_token = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email or self.username
    
    @property
    def is_admin_user(self):
        """Validates if the user has administrative privileges."""
        return self.role == self.UserRole.ADMIN or self.is_superuser
    
    @property
    def is_private_user(self):
        """Validates if the user has at least private-level access."""
        return self.role in [self.UserRole.PRIVATE, self.UserRole.ADMIN] or self.is_superuser
    
    @property
    def full_name(self):
        """Returns the formatted full name or fallback to username."""
        return f"{self.first_name} {self.last_name}".strip() or self.username