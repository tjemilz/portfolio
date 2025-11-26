"""
Admin configuration for authentication app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin for CustomUser model."""
    
    list_display = ['username', 'email', 'role', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Profil étendu', {
            'fields': ('role', 'phone', 'bio', 'avatar')
        }),
        ('Invitation', {
            'fields': ('invited_by', 'invitation_token', 'invitation_sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profil', {
            'fields': ('email', 'role')
        }),
    )
