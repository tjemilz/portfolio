"""
Middleware to prevent unauthorized direct access to media files.
Allows access for authenticated users, redirects others to login.
"""

from django.http import Http404, HttpResponseForbidden, JsonResponse
from django.conf import settings
import re


class ProtectMediaMiddleware:
    """
    Middleware to control access to media files.
    
    This middleware ensures that:
    1. Authenticated users can access all media files
    2. Unauthenticated users are denied access with 401 (triggers login redirect)
    3. API requests use proper authentication
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Patterns to protect
        self.protected_patterns = [
            re.compile(r'^/media/galleries/'),
            re.compile(r'^/media/thumbnails/'),
        ]
        # Public patterns (accessible without auth)
        self.public_patterns = [
            # Add patterns here if needed (e.g., public gallery covers)
        ]
    
    def __call__(self, request):
        path = request.path
        
        # Check if this is a protected media access attempt
        is_protected = any(pattern.match(path) for pattern in self.protected_patterns)
        
        if is_protected:
            # Check if it's explicitly public
            is_public = any(pattern.match(path) for pattern in self.public_patterns)
            
            if not is_public:
                # Check authentication
                if not request.user.is_authenticated:
                    # Return 401 for unauthenticated users
                    # Frontend will handle redirect to login
                    return JsonResponse(
                        {
                            'detail': 'Authentication required to access this resource.',
                            'redirect': '/login'
                        },
                        status=401
                    )
                
                # Authenticated users can access
                # Continue to serve the file
        
        response = self.get_response(request)
        
        # Add security headers for media files
        if '/media/' in path:
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
        
        return response
