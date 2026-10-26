"""
Views for galleries, images, access groups, print requests and secure media serving.
"""

import io
import zipfile
import logging
import mimetypes
from django.db.models import Q, Prefetch
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from users.permissions import IsAdminUser
from .models import Gallery, Image, AccessGroup, PrintRequest, PrintRequestStatus
from .serializers import (
    GalleryListSerializer,
    GalleryDetailSerializer,
    ImageSerializer,
    ImageListSerializer,
    AccessGroupSerializer,
    PrintRequestSerializer,
    PrintRequestCreateSerializer,
)

logger = logging.getLogger(__name__)


class GalleryViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Galleries.
    Read actions are filtered by user permissions.
    Write actions (create, update, delete) require IsAdminUser.
    """
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [AllowAny()]

    def get_queryset(self):
        user = self.request.user
        
        # Memory optimization: prefetch full images only when viewing gallery detail
        if self.action == 'retrieve':
            queryset = Gallery.objects.prefetch_related('images', 'allowed_groups').all()
        else:
            # For lists, only load lightweight image references to conserve server RAM
            queryset = Gallery.objects.prefetch_related(
                Prefetch('images', queryset=Image.objects.only('id', 'title')),
                'allowed_groups'
            ).all()

        # Anonymous: public only
        if not user or not user.is_authenticated:
            return queryset.filter(visibility=Gallery.Visibility.PUBLIC)

        # Admin: see everything
        if user.is_admin_user:
            return queryset

        # Authenticated: public + accessible private galleries
        user_groups = user.access_groups.all()
        return queryset.filter(
            Q(visibility=Gallery.Visibility.PUBLIC) |
            Q(allowed_groups__in=user_groups)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GalleryDetailSerializer
        return GalleryListSerializer

    @action(detail=False, methods=['get'])
    def navbar(self, request):
        """
        Ultra-lightweight endpoint for top navigation bar.
        Only returns necessary attributes to conserve RAM and bandwidth on mobile.
        """
        galleries = self.get_queryset().filter(
            visibility=Gallery.Visibility.PUBLIC,
            show_in_navbar=True
        ).exclude(slug__in=['bestof', 'best-of']).order_by('display_order', '-created_at')
        
        data = [{
            'id': str(g.id),
            'title': g.title,
            'name': g.title,
            'slug': g.slug,
            'display_order': g.display_order,
        } for g in galleries]
        return Response(data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Returns public galleries marked as featured."""
        galleries = self.get_queryset().filter(
            visibility=Gallery.Visibility.PUBLIC,
            is_featured=True
        ).exclude(slug__in=['bestof', 'best-of']).order_by('display_order', '-created_at')
        serializer = GalleryListSerializer(galleries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def toggle_featured(self, request, slug=None):
        """Quick toggle for admin to set or unset featured status with zero form friction."""
        gallery = self.get_object()
        gallery.is_featured = not gallery.is_featured
        gallery.save(update_fields=['is_featured'])
        return Response({
            'status': 'success',
            'id': str(gallery.id),
            'slug': gallery.slug,
            'is_featured': gallery.is_featured
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def toggle_navbar(self, request, slug=None):
        """Quick toggle for admin to show/hide gallery in the top navbar."""
        gallery = self.get_object()
        gallery.show_in_navbar = not gallery.show_in_navbar
        gallery.save(update_fields=['show_in_navbar'])
        return Response({
            'status': 'success',
            'id': str(gallery.id),
            'slug': gallery.slug,
            'show_in_navbar': gallery.show_in_navbar
        })

    @action(detail=False, methods=['get'])
    def public(self, request):
        """Returns public galleries grouped by gallery_type."""
        galleries = self.get_queryset().filter(visibility=Gallery.Visibility.PUBLIC)
        result = {}
        for gallery in galleries:
            g_type = gallery.gallery_type.lower()
            if g_type not in result:
                result[g_type] = []
            result[g_type].append(GalleryListSerializer(gallery).data)
        return Response(result)

    @action(detail=True, methods=['get'])
    def images(self, request, slug=None):
        """Returns images belonging to the specified gallery."""
        gallery = self.get_object()
        images = gallery.images.all()
        serializer = ImageListSerializer(images, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], permission_classes=[IsAuthenticated, IsAdminUser])
    def upload(self, request, slug=None):
        """Allows administrators to upload one or more photos directly into this gallery."""
        gallery = self.get_object()
        uploaded_files = request.FILES.getlist('images') or request.FILES.getlist('image')
        if not uploaded_files:
            return Response({'error': 'No image files provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        uploaded = []
        errors = []
        for file in uploaded_files:
            try:
                img = Image.objects.create(
                    title=file.name.rsplit('.', 1)[0],
                    file=file
                )
                img.galleries.add(gallery)
                uploaded.append(str(img.id))
            except Exception as e:
                errors.append(f"{file.name}: {str(e)}")
                
        return Response({
            'uploaded': len(uploaded),
            'errors': len(errors),
            'images': uploaded,
            'error_details': errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)


class ImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Images management, upload, and batch downloading.
    """
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Image.objects.filter(galleries__visibility=Gallery.Visibility.PUBLIC).distinct()
        if user.is_admin_user:
            return Image.objects.all()
        user_groups = user.access_groups.all()
        return Image.objects.filter(
            Q(galleries__visibility=Gallery.Visibility.PUBLIC) |
            Q(galleries__allowed_groups__in=user_groups)
        ).distinct()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def download_multiple(self, request):
        """Allows authorized users to download selected images bundled in a ZIP."""
        image_ids = request.data.get('image_ids', [])
        if not image_ids:
            return Response({'error': 'No image IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Filter strictly by user queryset to avoid leaking unauthorized images
        images = self.get_queryset().filter(id__in=image_ids)
        if not images.exists():
            return Response({'error': 'No accessible images found.'}, status=status.HTTP_404_NOT_FOUND)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for img in images:
                try:
                    if img.file and hasattr(img.file, 'path'):
                        arcname = f"{img.title or img.id}.jpg"
                        zip_file.write(img.file.path, arcname=arcname)
                except Exception as e:
                    logger.warning(f"Could not pack image {img.id} into zip: {e}")

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="portfolio_photos.zip"'
        return response

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def bulk_delete(self, request):
        """Allows administrators to delete multiple images in a batch."""
        image_ids = request.data.get('image_ids', [])
        if not image_ids:
            return Response({'error': 'No image IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted_count, _ = Image.objects.filter(id__in=image_ids).delete()
        return Response({'message': f'{deleted_count} images deleted successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def update_galleries(self, request, pk=None):
        """Allows administrators to update gallery associations for an image."""
        image = self.get_object()
        gallery_ids = request.data.get('gallery_ids', [])
        image.galleries.set(gallery_ids)
        return Response(self.get_serializer(image).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def bulk_update_galleries(self, request):
        """Allows administrators to bulk update gallery associations."""
        image_ids = request.data.get('image_ids', [])
        if not image_ids:
            return Response({'error': 'No image IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        images = Image.objects.filter(id__in=image_ids)
        
        if 'set_galleries' in request.data:
            galleries = request.data['set_galleries']
            for img in images:
                img.galleries.set(galleries)
        elif 'add_galleries' in request.data:
            galleries = request.data['add_galleries']
            for img in images:
                img.galleries.add(*galleries)
        elif 'remove_galleries' in request.data:
            galleries = request.data['remove_galleries']
            for img in images:
                img.galleries.remove(*galleries)
                
        return Response({'message': 'Galleries updated successfully.'}, status=status.HTTP_200_OK)


class AccessGroupViewSet(viewsets.ModelViewSet):
    """
    Manages Access Groups. Strictly reserved for administrators.
    """
    queryset = AccessGroup.objects.all()
    serializer_class = AccessGroupSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class PrintRequestViewSet(viewsets.ModelViewSet):
    """
    Handles user print requests.
    - Authenticated users can list their own requests and create new ones.
    - Admins can list all requests and update their fulfillment status.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user:
            return PrintRequest.objects.all().order_by('-created_at')
        return PrintRequest.objects.filter(user=user).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return PrintRequestCreateSerializer
        return PrintRequestSerializer

    def update(self, request, *args, **kwargs):
        if not request.user.is_admin_user:
            return Response({'error': 'Only administrators can update print request status.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Returns pending print requests."""
        qs = self.get_queryset().filter(status=PrintRequestStatus.PENDING)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# ==============================================================================
# SECURE HIGH-PERFORMANCE MEDIA SERVING (X-Accel-Redirect)
# ==============================================================================

@api_view(['GET', 'HEAD'])
@permission_classes([AllowAny])
def serve_secure_media(request, image_id):
    """
    Gatekeeper endpoint for media access.
    Validates permissions using request.user (authenticated via HttpOnly JWT cookie or Bearer header),
    then delegates high-speed static delivery to Nginx via X-Accel-Redirect.
    """
    image = get_object_or_404(Image, id=image_id)
    user = request.user
    can_access = False

    # 1. Public galleries: accessible to all
    if image.galleries.filter(visibility=Gallery.Visibility.PUBLIC).exists():
        can_access = True
    # 2. Authenticated: admin or member of an authorized access group
    elif user and user.is_authenticated:
        if user.is_admin_user:
            can_access = True
        else:
            user_groups = user.access_groups.all()
            if image.galleries.filter(allowed_groups__in=user_groups).exists():
                can_access = True

    if not can_access:
        raise Http404("Image not found or permission denied.")

    content_type, _ = mimetypes.guess_type(image.file.name)
    response = HttpResponse(content_type=content_type or 'image/jpeg')
    # Nginx intercepts this internal path and streams the file directly
    response['X-Accel-Redirect'] = f'/internal-media/{image.file.name}'
    response['Cache-Control'] = 'private, max-age=604800'
    return response
