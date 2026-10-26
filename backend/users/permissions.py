"""
Custom permissions for user authentication and role-based access control.
"""

from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to authenticated users with ADMIN role or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_admin_user
        )


class IsPrivateUser(permissions.BasePermission):
    """
    Allows access to authenticated users with PRIVATE or ADMIN role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_private_user
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing read access to everyone,
    and write access only to the object owner or administrators.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_admin_user:
            return True
            
        owner = getattr(obj, 'user', getattr(obj, 'created_by', getattr(obj, 'uploaded_by', None)))
        return owner == request.user
