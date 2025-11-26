"""
Custom permissions for authentication.
"""

from rest_framework import permissions


class IsPublicUser(permissions.BasePermission):
    """
    Permission for any user (authenticated or not).
    Used for public endpoints.
    """
    
    def has_permission(self, request, view):
        return True


class IsPrivateUser(permissions.BasePermission):
    """
    Permission for authenticated users with PRIVATE or ADMIN role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_private_user


class IsAdminUser(permissions.BasePermission):
    """
    Permission for admin users only.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_admin_user


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admins to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner or admin
        if hasattr(obj, 'user'):
            is_owner = obj.user == request.user
        elif hasattr(obj, 'created_by'):
            is_owner = obj.created_by == request.user
        else:
            is_owner = False
        
        return is_owner or request.user.is_admin_user
