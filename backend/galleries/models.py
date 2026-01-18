"""
Galleries app - Unified models for Gallery management.

This module contains the consolidated models for managing:
- UserGroup: Groups for private gallery access
- Gallery: Public and private photo galleries  
- Image: Individual photos within galleries (can belong to multiple galleries)
- PrintRequest & PrintRequestItem: Print ordering system
"""

from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import MinValueValidator
import uuid
import os


def gallery_image_path(instance, filename):
    """Generate upload path for gallery images."""
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    # Store all images in a common folder since they can belong to multiple galleries
    return f"galleries/images/{new_filename}"


def thumbnail_path(instance, filename):
    """Generate upload path for thumbnails."""
    ext = filename.split('.')[-1]
    new_filename = f"thumb_{uuid.uuid4().hex}.{ext}"
    return f"thumbnails/{new_filename}"


class UserGroup(models.Model):
    """
    Groups for managing access to private galleries.
    Users can be assigned to groups to gain access to specific galleries.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='gallery_groups',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Groupe d'utilisateurs"
        verbose_name_plural = "Groupes d'utilisateurs"
        ordering = ['name']

    def __str__(self):
        return self.name


class Gallery(models.Model):
    """
    A photo gallery that can be public or private.
    Private galleries require authentication and group membership.
    """
    
    class Visibility(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Publique'
        PRIVATE = 'PRIVATE', 'Privée'
    
    class GalleryType(models.TextChoices):
        BESTOF = 'BESTOF', 'Best Of'
        BW = 'BW', 'Noir & Blanc'
        STREETS = 'STREETS', 'Street Photography'
        EXPLORE = 'EXPLORE', 'Exploration'
        PORTRAIT = 'PORTRAIT', 'Portrait'
        MARIAGE = 'MARIAGE', 'Mariage'
        BAPTEME = 'BAPTEME', 'Baptême'
        ANNIVERSAIRE = 'ANNIVERSAIRE', 'Anniversaire'
        FAMILLE = 'FAMILLE', 'Famille'
        PROFESSIONNEL = 'PROFESSIONNEL', 'Professionnel'
        EVENEMENT = 'EVENEMENT', 'Événement'
        OTHER = 'OTHER', 'Autre'
    
    # Basic info
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    gallery_type = models.CharField(
        max_length=20,
        choices=GalleryType.choices,
        default=GalleryType.OTHER
    )
    
    # Event info (for private galleries like weddings, etc.)
    event_key = models.CharField(max_length=100, unique=True, blank=True, null=True)
    event_date = models.DateField(null=True, blank=True)
    event_location = models.CharField(max_length=255, blank=True)
    
    # Visibility and access
    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PUBLIC
    )
    allowed_groups = models.ManyToManyField(
        UserGroup,
        related_name='accessible_galleries',
        blank=True,
        help_text="Groupes autorisés à voir cette galerie privée"
    )
    
    # Cover image
    cover_image = models.ImageField(
        upload_to='galleries/covers/',
        null=True,
        blank=True
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_galleries'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Display options
    is_featured = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    allow_download = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Galerie"
        verbose_name_plural = "Galeries"
        ordering = ['-is_featured', 'display_order', '-created_at']

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Gallery.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
    
    @property
    def is_public(self):
        return self.visibility == self.Visibility.PUBLIC
    
    @property
    def image_count(self):
        return self.images.count()
    
    def can_access(self, user):
        """Check if a user can access this gallery."""
        if self.is_public:
            return True
        if user is None or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True
        # Check group membership
        return self.allowed_groups.filter(members=user).exists()


class Image(models.Model):
    """
    An individual image that can belong to multiple galleries.
    """
    # Many-to-many relationship with galleries
    galleries = models.ManyToManyField(
        Gallery,
        related_name='images',
        blank=True
    )
    
    # Image files
    image = models.ImageField(upload_to=gallery_image_path)
    thumbnail = models.ImageField(
        upload_to=thumbnail_path,
        null=True,
        blank=True
    )
    
    # Metadata
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    
    # Technical info
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="Size in bytes")
    
    # EXIF data (optional)
    camera = models.CharField(max_length=100, blank=True)
    lens = models.CharField(max_length=100, blank=True)
    focal_length = models.CharField(max_length=50, blank=True)
    aperture = models.CharField(max_length=20, blank=True)
    shutter_speed = models.CharField(max_length=20, blank=True)
    iso = models.PositiveIntegerField(null=True, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    
    # Display
    display_order = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    
    # Timestamps
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_images'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Image"
        verbose_name_plural = "Images"
        ordering = ['display_order', '-uploaded_at']

    def __str__(self):
        return self.title or f"Image {self.pk} - {self.gallery.name}"
    
    @property
    def filename(self):
        return os.path.basename(self.image.name)
    
    def save(self, *args, **kwargs):
        # Get image dimensions if not set
        if self.image and not self.width:
            try:
                from PIL import Image as PILImage
                with PILImage.open(self.image) as img:
                    self.width, self.height = img.size
            except Exception:
                pass
        super().save(*args, **kwargs)


# =====================================================
# Print Request Models
# =====================================================

class PrintSize(models.TextChoices):
    """Available print sizes with prices."""
    SMALL = '10x15', '10x15 cm (0,50€)'
    LARGE = '50x70', '50x70 cm (40,00€)'
    OTHER = 'other', 'Autre (à discuter)'


class PrintRequestStatus(models.TextChoices):
    """Status of a print request."""
    PENDING = 'PENDING', 'En attente'
    IN_PROGRESS = 'IN_PROGRESS', 'En cours'
    COMPLETED = 'COMPLETED', 'Terminée'
    CANCELLED = 'CANCELLED', 'Annulée'


class PrintRequest(models.Model):
    """
    Model to track print requests from users.
    
    A user can request multiple prints of images they have access to.
    Each request can contain multiple items (different images and sizes).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='print_requests',
        verbose_name='Utilisateur'
    )
    status = models.CharField(
        max_length=20,
        choices=PrintRequestStatus.choices,
        default=PrintRequestStatus.PENDING,
        verbose_name='Statut'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Notes',
        help_text='Notes ou demandes spéciales de l\'utilisateur'
    )
    admin_notes = models.TextField(
        blank=True,
        verbose_name='Notes admin',
        help_text='Notes internes (non visibles par l\'utilisateur)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière modification'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Demande d\'impression'
        verbose_name_plural = 'Demandes d\'impression'
    
    def __str__(self):
        return f"Demande #{self.id} - {self.user.username} - {self.get_status_display()}"
    
    @property
    def total_items(self):
        """Total number of items in this request."""
        return self.items.count()
    
    @property
    def estimated_total(self):
        """Calculate estimated total price."""
        total = 0
        for item in self.items.all():
            total += item.estimated_price
        return total


class PrintRequestItem(models.Model):
    """
    Individual item in a print request.
    
    Each item represents one image with a specific print size and quantity.
    """
    PRICE_MAP = {
        PrintSize.SMALL: 0.50,
        PrintSize.LARGE: 40.00,
        PrintSize.OTHER: 0.00,  # À discuter
    }
    
    request = models.ForeignKey(
        PrintRequest,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Demande'
    )
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        related_name='print_items',
        verbose_name='Image'
    )
    print_size = models.CharField(
        max_length=10,
        choices=PrintSize.choices,
        verbose_name='Format d\'impression'
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name='Quantité'
    )
    custom_size = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Format personnalisé',
        help_text='Si "Autre" est sélectionné, préciser le format souhaité'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Ajouté le'
    )
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Article à imprimer'
        verbose_name_plural = 'Articles à imprimer'
    
    def __str__(self):
        return f"{self.image.title or 'Image'} - {self.get_print_size_display()} x{self.quantity}"
    
    @property
    def unit_price(self):
        """Get the unit price for this print size."""
        return self.PRICE_MAP.get(self.print_size, 0.00)
    
    @property
    def estimated_price(self):
        """Calculate estimated price for this item."""
        return self.unit_price * self.quantity
    
    @property
    def image_thumbnail(self):
        """Get thumbnail URL for admin display."""
        if self.image.thumbnail_url:
            return self.image.thumbnail_url
        return self.image.image_url
