"""
Custom permissions for galleries app.
"""

from rest_framework import permissions


class CanAccessGallery(permissions.BasePermission):
    """
    Permission to check if user can access a specific gallery.
    - Public galleries: Anyone can access
    - Private galleries: Only authenticated users in allowed groups
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for public galleries
        if obj.is_public:
            return True
        
        # Must be authenticated for private galleries
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins and staff can access all galleries
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Check group membership
        return obj.can_access(request.user)


class CanUploadImage(permissions.BasePermission):
    """
    Permission to check if user can upload images to a gallery.
    Only staff and superusers can upload.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser


class CanDeleteImage(permissions.BasePermission):
    """
    Permission to check if user can delete images.
    Only staff and superusers can delete.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone,
    but write access only to admin users.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for admin users
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_staff or request.user.is_superuser)
        )
