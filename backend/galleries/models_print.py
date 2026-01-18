"""
Models for print requests.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from .models import Image


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
