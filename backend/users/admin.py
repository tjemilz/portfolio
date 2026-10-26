"""
Admin interface configuration for user management.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Customizes the Django admin interface for the CustomUser model,
    exposing role-based fields and invitation metadata.
    """
    
    list_display = ['username', 'email', 'role', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    # Extend default User fieldsets to include custom profile data
    fieldsets = UserAdmin.fieldsets + (
        ('Extended Profile', {
            'fields': ('role', 'phone', 'bio', 'avatar')
        }),
        ('Invitation System', {
            'fields': ('invited_by', 'invitation_token', 'invitation_sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile', {
            'fields': ('email', 'role')
        }),
    )