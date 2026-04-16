"""
URL configuration for galleries app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GalleryViewSet, ImageViewSet, UserGroupViewSet, serve_image, serve_thumbnail

router = DefaultRouter()
router.register(r'images', ImageViewSet, basename='image')
router.register(r'groups', UserGroupViewSet, basename='usergroup')
router.register(r'', GalleryViewSet, basename='gallery')

urlpatterns = [
    # Secure image serving endpoints
    path('<slug:gallery_slug>/images/<str:filename>/', serve_image, name='serve-image'),
    path('<slug:gallery_slug>/thumbnails/<str:filename>/', serve_thumbnail, name='serve-thumbnail'),
    # Router URLs
    path('', include(router.urls)),
]
