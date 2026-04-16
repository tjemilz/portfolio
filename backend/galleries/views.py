"""
Views for galleries app.
"""

import os
import mimetypes
import zipfile
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings

from .models import Gallery, Image, UserGroup, PrintRequest, PrintRequestItem
from .serializers import (
    GalleryListSerializer, GalleryDetailSerializer, GalleryCreateSerializer,
    ImageSerializer, ImageListSerializer, UserGroupSerializer,
    PrintRequestSerializer, PrintRequestCreateSerializer
)
from .permissions import CanAccessGallery, CanUploadImage, CanDeleteImage, IsAdminOrReadOnly


# Constantes pour l'upload
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']


class GalleryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Gallery CRUD operations.
    
    list: Get all accessible galleries
    retrieve: Get a specific gallery with its images
    create: Create a new gallery (admin only)
    update: Update a gallery (admin only)
    destroy: Delete a gallery (admin only)
    """
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'event_location']
    ordering_fields = ['name', 'created_at', 'display_order']
    ordering = ['-created_at']  # Default ordering to avoid pagination warning
    lookup_field = 'slug'
    
    def get_queryset(self):
        """Filter galleries based on user access rights."""
        user = self.request.user
        # Optimisation: prefetch les relations pour éviter les requêtes N+1
        queryset = Gallery.objects.prefetch_related(
            'images',
            'allowed_groups',
            'allowed_groups__members'
        ).select_related()
        
        # Filter by visibility
        if not user or not user.is_authenticated:
            # Anonymous users see only public galleries
            queryset = queryset.filter(visibility='PUBLIC')
        elif not (user.is_staff or user.is_superuser):
            # Regular authenticated users see public + their groups' galleries
            queryset = queryset.filter(
                Q(visibility='PUBLIC') |
                Q(allowed_groups__members=user)
            ).distinct()
        # Staff/superusers see all galleries
        
        # Optional filters from query params
        gallery_type = self.request.query_params.get('type')
        if gallery_type:
            queryset = queryset.filter(gallery_type=gallery_type.upper())
        
        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility.upper())
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return GalleryListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return GalleryCreateSerializer
        return GalleryDetailSerializer
    
    def get_permissions(self):
        if self.action == 'retrieve':
            return [CanAccessGallery()]
        return super().get_permissions()
    
    @action(detail=True, methods=['get'])
    def images(self, request, slug=None):
        """Get all images for a gallery."""
        gallery = self.get_object()
        # Optimisation: prefetch les galeries associées pour chaque image
        images = gallery.images.prefetch_related('galleries').all()
        serializer = ImageListSerializer(images, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def public(self, request):
        """Get all public galleries grouped by type."""
        # Optimisation: prefetch les images pour le count et éviter N+1
        galleries = Gallery.objects.filter(visibility='PUBLIC').prefetch_related('images')
        
        # Group by type
        result = {}
        for gallery in galleries:
            gallery_type = gallery.gallery_type.lower()
            if gallery_type not in result:
                result[gallery_type] = []
            serializer = GalleryListSerializer(gallery, context={'request': request})
            result[gallery_type].append(serializer.data)
        
        return Response(result)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, slug=None):
        """
        Upload images to a gallery.
        
        Accepts multiple files via multipart/form-data.
        - Validates file type (JPEG, PNG, WebP only)
        - Validates file size (max 20MB)
        - Generates thumbnails automatically
        - Extracts EXIF metadata
        - Adds image to the specified gallery
        """
        gallery = self.get_object()
        
        # Vérifier les permissions
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Seuls les administrateurs peuvent uploader des images'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        files = request.FILES.getlist('images')
        if not files:
            # Essayer aussi avec 'image' au singulier
            single_file = request.FILES.get('image')
            if single_file:
                files = [single_file]
            else:
                return Response(
                    {'error': 'Aucun fichier fourni. Utilisez le champ "images" ou "image".'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        uploaded_images = []
        errors = []
        
        for idx, file in enumerate(files):
            # Valider l'extension
            ext = file.name.split('.')[-1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({
                    'file': file.name,
                    'error': f'Extension non autorisée. Extensions acceptées: {", ".join(ALLOWED_EXTENSIONS)}'
                })
                continue
            
            # Valider la taille
            if file.size > MAX_FILE_SIZE:
                errors.append({
                    'file': file.name,
                    'error': f'Fichier trop volumineux. Taille max: {MAX_FILE_SIZE // (1024*1024)}MB'
                })
                continue
            
            try:
                # Créer l'objet Image avec les données de base
                image = Image(
                    image=file,
                    title=os.path.splitext(file.name)[0],
                    file_size=file.size,
                    uploaded_by=request.user
                )
                
                # Sauvegarder l'image - les signaux vont automatiquement :
                # 1. Extraire les données EXIF
                # 2. Générer le thumbnail 
                # 3. Calculer les dimensions
                image.save()
                
                # Associer à la galerie (ManyToMany)
                image.galleries.add(gallery)
                
                uploaded_images.append(ImageSerializer(image, context={'request': request}).data)
                
            except Exception as e:
                errors.append({
                    'file': file.name,
                    'error': str(e)
                })
        
        return Response({
            'uploaded': len(uploaded_images),
            'errors': len(errors),
            'images': uploaded_images,
            'error_details': errors if errors else None
        }, status=status.HTTP_201_CREATED if uploaded_images else status.HTTP_400_BAD_REQUEST)


class ImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Image CRUD operations.
    
    Supports:
    - List all images (filterable by gallery)
    - Create new images with multiple gallery associations
    - Update image metadata and gallery associations
    - Delete images
    - Download single or multiple images
    """
    queryset = Image.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ImageListSerializer
        return ImageSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'bulk_delete', 'update_galleries', 'bulk_update_galleries']:
            return [CanUploadImage()]
        if self.action in ['download', 'download_multiple']:
            return [AllowAny()]
        return [IsAuthenticatedOrReadOnly()]
    
    def get_queryset(self):
        """Filter images based on gallery access."""
        queryset = Image.objects.all().prefetch_related('galleries')
        user = self.request.user
        
        # Filter by gallery
        gallery_id = self.request.query_params.get('gallery')
        if gallery_id:
            queryset = queryset.filter(galleries__id=gallery_id)
        
        gallery_slug = self.request.query_params.get('gallery_slug')
        if gallery_slug:
            queryset = queryset.filter(galleries__slug=gallery_slug)
        
        # Filter only accessible images for non-admin users
        if not user or not user.is_authenticated:
            queryset = queryset.filter(galleries__visibility='PUBLIC').distinct()
        elif not (user.is_staff or user.is_superuser):
            queryset = queryset.filter(
                Q(galleries__visibility='PUBLIC') |
                Q(galleries__allowed_groups__members=user)
            ).distinct()
        
        return queryset.distinct()
    
    def perform_create(self, serializer):
        """Create image and handle gallery associations."""
        image = serializer.save(uploaded_by=self.request.user)
        
        # Handle gallery_ids from request
        gallery_ids = self.request.data.getlist('gallery_ids', [])
        if gallery_ids:
            galleries = Gallery.objects.filter(id__in=gallery_ids)
            image.galleries.set(galleries)
    
    def perform_update(self, serializer):
        """Update image and handle gallery associations."""
        instance = serializer.save()
        
        # Handle gallery_ids from request if provided
        if 'gallery_ids' in self.request.data:
            gallery_ids = self.request.data.getlist('gallery_ids', [])
            if isinstance(gallery_ids, str):
                gallery_ids = [gallery_ids]
            galleries = Gallery.objects.filter(id__in=gallery_ids)
            instance.galleries.set(galleries)
    
    @action(detail=True, methods=['post'])
    def update_galleries(self, request, pk=None):
        """
        Update gallery associations for an image.
        
        Expects: {"gallery_ids": [1, 2, 3]} or {"add": [1, 2], "remove": [3, 4]}
        """
        image = self.get_object()
        
        # Mode: set all galleries
        if 'gallery_ids' in request.data:
            gallery_ids = request.data.get('gallery_ids', [])
            galleries = Gallery.objects.filter(id__in=gallery_ids)
            image.galleries.set(galleries)
            return Response({
                'message': 'Galeries mises à jour',
                'galleries': [{'id': g.id, 'name': g.name, 'slug': g.slug} for g in image.galleries.all()]
            })
        
        # Mode: add/remove specific galleries
        added = []
        removed = []
        
        if 'add' in request.data:
            add_ids = request.data.get('add', [])
            galleries_to_add = Gallery.objects.filter(id__in=add_ids)
            image.galleries.add(*galleries_to_add)
            added = [{'id': g.id, 'name': g.name} for g in galleries_to_add]
        
        if 'remove' in request.data:
            remove_ids = request.data.get('remove', [])
            galleries_to_remove = Gallery.objects.filter(id__in=remove_ids)
            image.galleries.remove(*galleries_to_remove)
            removed = [{'id': g.id, 'name': g.name} for g in galleries_to_remove]
        
        return Response({
            'message': 'Galeries mises à jour',
            'added': added,
            'removed': removed,
            'galleries': [{'id': g.id, 'name': g.name, 'slug': g.slug} for g in image.galleries.all()]
        })
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Delete multiple images at once.
        
        Expects: {"image_ids": [1, 2, 3]}
        """
        image_ids = request.data.get('image_ids', [])
        
        if not image_ids:
            return Response(
                {'error': 'Aucune image sélectionnée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        images = Image.objects.filter(pk__in=image_ids)
        count = images.count()
        
        # Delete image files as well
        for image in images:
            if image.image:
                try:
                    image.image.delete(save=False)
                except:
                    pass
            if image.thumbnail:
                try:
                    image.thumbnail.delete(save=False)
                except:
                    pass
        
        images.delete()
        
        return Response({
            'message': f'{count} image(s) supprimée(s)',
            'deleted_count': count
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update_galleries(self, request):
        """
        Update gallery associations for multiple images.
        
        Expects: {
            "image_ids": [1, 2, 3],
            "add_galleries": [1, 2],  // optional
            "remove_galleries": [3],  // optional
            "set_galleries": [1, 2]   // optional, replaces all associations
        }
        """
        image_ids = request.data.get('image_ids', [])
        
        if not image_ids:
            return Response(
                {'error': 'Aucune image sélectionnée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        images = Image.objects.filter(pk__in=image_ids)
        
        if 'set_galleries' in request.data:
            gallery_ids = request.data.get('set_galleries', [])
            galleries = Gallery.objects.filter(id__in=gallery_ids)
            for image in images:
                image.galleries.set(galleries)
        else:
            if 'add_galleries' in request.data:
                add_ids = request.data.get('add_galleries', [])
                galleries_to_add = Gallery.objects.filter(id__in=add_ids)
                for image in images:
                    image.galleries.add(*galleries_to_add)
            
            if 'remove_galleries' in request.data:
                remove_ids = request.data.get('remove_galleries', [])
                galleries_to_remove = Gallery.objects.filter(id__in=remove_ids)
                for image in images:
                    image.galleries.remove(*galleries_to_remove)
        
        return Response({
            'message': f'{images.count()} image(s) mise(s) à jour',
            'updated_count': images.count()
        })
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the original image file."""
        image = self.get_object()
        
        # Check if any gallery allows downloads
        allow_download = any(g.allow_download for g in image.galleries.all())
        if not allow_download:
            return Response(
                {'error': 'Downloads are not allowed for this image'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check gallery access - user must have access to at least one gallery
        user = request.user
        can_access = False
        for gallery in image.galleries.all():
            if gallery.can_access(user):
                can_access = True
                break
        
        if not can_access:
            return Response(
                {'error': 'You do not have access to this image'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return FileResponse(
            image.image.open('rb'),
            as_attachment=True,
            filename=image.filename
        )
    
    @action(detail=False, methods=['post'])
    def download_multiple(self, request):
        """
        Download multiple images as a ZIP file.
        
        Expects POST body with: {"image_ids": [1, 2, 3, ...]}
        """
        image_ids = request.data.get('image_ids', [])
        
        if not image_ids:
            return Response(
                {'error': 'Aucune image sélectionnée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        images = Image.objects.filter(pk__in=image_ids).prefetch_related('galleries')
        
        if not images:
            return Response(
                {'error': 'Images non trouvées'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier les accès et les téléchargements autorisés
        accessible_images = []
        for image in images:
            can_access = False
            allow_download = False
            for gallery in image.galleries.all():
                if gallery.can_access(request.user):
                    can_access = True
                if gallery.allow_download:
                    allow_download = True
            if can_access and allow_download:
                accessible_images.append(image)
        
        if not accessible_images:
            return Response(
                {'error': 'Aucune image accessible pour le téléchargement'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Créer le fichier ZIP en mémoire
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for image in accessible_images:
                try:
                    file_content = image.image.read()
                    zip_file.writestr(image.filename, file_content)
                except Exception as e:
                    print(f"Error adding image to ZIP: {e}")
        
        zip_buffer.seek(0)
        
        # Nom du fichier ZIP
        zip_filename = "images.zip"
        
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
        
        return response


class UserGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserGroup management (admin only).
    """
    queryset = UserGroup.objects.all()
    serializer_class = UserGroupSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']


@api_view(['GET'])
@permission_classes([AllowAny])
def serve_image(request, gallery_slug, filename):
    """
    Serve an image file securely, checking gallery access permissions.
    
    This view serves images through Django rather than directly through the web server,
    allowing us to check permissions before serving private images.
    """
    try:
        gallery = Gallery.objects.get(slug=gallery_slug)
    except Gallery.DoesNotExist:
        raise Http404("Gallery not found")
    
    # Check if user can access the gallery
    user = request.user if request.user.is_authenticated else None
    
    if gallery.visibility == 'PRIVATE':
        if not user:
            return HttpResponse("Unauthorized", status=401)
        if not gallery.can_access(user):
            return HttpResponse("Forbidden", status=403)
    
    # Find the image file
    # Try different possible paths
    possible_paths = [
        os.path.join(settings.MEDIA_ROOT, 'galleries', 'public', gallery_slug, filename),
        os.path.join(settings.MEDIA_ROOT, 'galleries', 'private', gallery_slug, filename),
    ]
    
    file_path = None
    for path in possible_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        raise Http404("Image not found")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(filename)
    if content_type is None:
        content_type = 'application/octet-stream'
    
    # Serve the file with appropriate cache headers
    response = FileResponse(open(file_path, 'rb'), content_type=content_type)
    response['Cache-Control'] = 'public, max-age=86400'  # Cache for 1 day
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def serve_thumbnail(request, gallery_slug, filename):
    """
    Serve a thumbnail image for faster loading in galleries.
    """
    try:
        gallery = Gallery.objects.get(slug=gallery_slug)
    except Gallery.DoesNotExist:
        raise Http404("Gallery not found")
    
    # Check permissions for private galleries
    user = request.user if request.user.is_authenticated else None
    
    if gallery.visibility == 'PRIVATE':
        if not user:
            return HttpResponse("Unauthorized", status=401)
        if not gallery.can_access(user):
            return HttpResponse("Forbidden", status=403)
    
    # Find the image by its original filename in this gallery
    try:
        # More efficient query to find image by filename in this specific gallery
        image = Image.objects.filter(
            galleries=gallery,
            image__icontains=filename
        ).first()
        
        if not image:
            # Try with exact filename match at the end of the path
            image = Image.objects.filter(
                galleries=gallery,
                image__endswith=filename
            ).first()
        
        if not image:
            raise Http404("Image not found in this gallery")
        
        # Use thumbnail if available and exists
        if image.thumbnail and hasattr(image.thumbnail, 'path'):
            try:
                thumbnail_path = image.thumbnail.path
                if os.path.exists(thumbnail_path):
                    content_type, _ = mimetypes.guess_type(thumbnail_path)
                    if content_type is None:
                        content_type = 'image/jpeg'
                    
                    response = FileResponse(open(thumbnail_path, 'rb'), content_type=content_type)
                    response['Cache-Control'] = 'public, max-age=604800'  # Cache for 1 week
                    response['Content-Disposition'] = f'inline; filename="thumb_{filename}"'
                    return response
            except (ValueError, OSError):
                # Thumbnail file issue, fall back to original
                pass
        
        # Fall back to original image if thumbnail doesn't exist or has issues
        return serve_image(request, gallery_slug, filename)
        
    except Exception:
        # Final fall back to original image
        return serve_image(request, gallery_slug, filename)


# =====================================================
# Print Request Views
# =====================================================

class PrintRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing print requests.
    
    Users can:
    - List their own print requests
    - Create new print requests
    - View details of their requests
    
    Admin can:
    - View all print requests
    - Update status and admin notes
    - Delete requests
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter requests based on user role."""
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Admin sees all requests
            return PrintRequest.objects.prefetch_related(
                'items__image',
                'user'
            ).all()
        else:
            # Users see only their own requests
            return PrintRequest.objects.prefetch_related(
                'items__image'
            ).filter(user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PrintRequestCreateSerializer
        return PrintRequestSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new print request."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return with full details
        output_serializer = PrintRequestSerializer(
            serializer.instance,
            context={'request': request}
        )
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update print request (admin only for status/admin_notes)."""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Seuls les administrateurs peuvent modifier les demandes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update (admin only)."""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Seuls les administrateurs peuvent modifier les demandes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete print request."""
        instance = self.get_object()
        
        # Users can only delete their own pending requests
        if not (request.user.is_staff or request.user.is_superuser):
            if instance.user != request.user:
                return Response(
                    {'detail': 'Vous ne pouvez supprimer que vos propres demandes.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if instance.status != 'PENDING':
                return Response(
                    {'detail': 'Seules les demandes en attente peuvent être supprimées.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's print requests."""
        requests = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending(self, request):
        """Get pending print requests (admin view)."""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Permission refusée.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pending_requests = self.get_queryset().filter(status='PENDING')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)
