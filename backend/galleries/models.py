import uuid
from django.db import models
from django.utils.text import slugify
from django.conf import settings
from django.core.validators import MinValueValidator


def get_image_upload_path(instance, filename):
    """Generates unique file path for uploaded images."""
    ext = filename.split('.')[-1]
    return f"galleries/images/{uuid.uuid4().hex}.{ext}"


class AccessGroup(models.Model):
    """
    Access group linking users to private galleries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom du groupe")
    description = models.TextField(blank=True, verbose_name="Description")
    
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='access_groups',
        blank=True
    )

    class Meta:
        verbose_name = "Groupe d'accès"
        verbose_name_plural = "Groupes d'accès"

    def __str__(self):
        return self.name


class Gallery(models.Model):
    """
    Photo gallery (Public or Private).
    """
    class Visibility(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Publique'
        PRIVATE = 'PRIVATE', 'Privée'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Titre")
    slug = models.SlugField(max_length=200, unique=True, db_index=True, blank=True)
    description = models.TextField(blank=True, verbose_name="Description")
    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
        db_index=True
    )
    gallery_type = models.CharField(
        max_length=50,
        default='OTHER',
        db_index=True
    )
    
    allowed_groups = models.ManyToManyField(
        AccessGroup,
        related_name='accessible_galleries',
        blank=True
    )
    
    is_featured = models.BooleanField(default=False, db_index=True, verbose_name="Mise en avant")
    show_in_navbar = models.BooleanField(default=True, db_index=True, verbose_name="Dans la barre supérieure")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    allow_download = models.BooleanField(default=True, verbose_name="Autoriser le téléchargement")
    
    event_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']
        verbose_name = "Galerie"
        verbose_name_plural = "Galeries"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def name(self):
        """Frontend backwards compatibility."""
        return self.title


class Image(models.Model):
    """
    Image asset protected and served via X-Accel-Redirect.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    galleries = models.ManyToManyField(
        Gallery,
        related_name='images',
        blank=True
    )
    file = models.ImageField(upload_to=get_image_upload_path)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    title = models.CharField(max_length=200, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-uploaded_at']
        verbose_name = "Image"
        verbose_name_plural = "Images"

    def __str__(self):
        return self.title or f"Image {self.id}"

    @property
    def secure_url(self):
        return f"/api/media/secure/{self.id}/"

    @property
    def image_url(self):
        return self.secure_url

    @property
    def thumbnail_url(self):
        return self.secure_url


class PrintSize(models.TextChoices):
    SMALL = '10x15', '10x15 cm (0,50€)'
    LARGE = '50x70', '50x70 cm (40,00€)'
    OTHER = 'other', 'Autre (à discuter)'


class PrintRequestStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente'
    IN_PROGRESS = 'IN_PROGRESS', 'En cours'
    COMPLETED = 'COMPLETED', 'Terminée'
    CANCELLED = 'CANCELLED', 'Annulée'


class PrintRequest(models.Model):
    """
    Tracks print requests from authenticated users.
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
    notes = models.TextField(blank=True, verbose_name='Notes client')
    admin_notes = models.TextField(blank=True, verbose_name='Notes admin')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Demande d\'impression'
        verbose_name_plural = 'Demandes d\'impression'
    
    def __str__(self):
        return f"Demande #{self.id} - {self.user.username} - {self.get_status_display()}"
    
    @property
    def total_items(self):
        return self.items.count()
    
    @property
    def estimated_total(self):
        return sum(item.estimated_price for item in self.items.all())


class PrintRequestItem(models.Model):
    """
    Individual image item within a print request.
    """
    PRICE_MAP = {
        PrintSize.SMALL: 0.50,
        PrintSize.LARGE: 40.00,
        PrintSize.OTHER: 0.00,
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
        verbose_name='Format'
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name='Quantité'
    )
    custom_size = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Format personnalisé'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Article d\'impression'
        verbose_name_plural = 'Articles d\'impression'
    
    def __str__(self):
        return f"{self.image.title or 'Image'} - {self.get_print_size_display()} x{self.quantity}"
    
    @property
    def unit_price(self):
        return self.PRICE_MAP.get(self.print_size, 0.00)
    
    @property
    def estimated_price(self):
        return self.unit_price * self.quantity
