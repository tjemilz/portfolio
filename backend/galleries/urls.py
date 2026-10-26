"""
URL configuration for galleries, media, access groups, and print requests.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GalleryViewSet,
    ImageViewSet,
    AccessGroupViewSet,
    PrintRequestViewSet,
    serve_secure_media
)

router = DefaultRouter()
router.register(r'galleries/images', ImageViewSet, basename='image')
router.register(r'galleries/print-requests', PrintRequestViewSet, basename='print-request')
router.register(r'galleries/groups', AccessGroupViewSet, basename='gallery-group')
router.register(r'groups', AccessGroupViewSet, basename='group')
router.register(r'galleries', GalleryViewSet, basename='gallery')

urlpatterns = [
    # High-performance X-Accel-Redirect media route
    path('media/secure/<uuid:image_id>/', serve_secure_media, name='serve-secure-media'),
    
    # API endpoints
    path('', include(router.urls)),
]
