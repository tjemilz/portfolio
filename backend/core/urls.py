"""
Main URL router mapping core application endpoints.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # User management & authentication
    path('api/auth/', include('users.urls')),
    
    # Galleries, media and access groups
    path('api/', include('galleries.urls')),
]

# Development media serving
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
