"""
Admin configuration for galleries app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import UserGroup, Gallery, Image, PrintRequest, PrintRequestItem


# Inline for M2M relationship - uses through table automatically
class ImageGalleryInline(admin.TabularInline):
    """Inline to show images in a gallery through M2M."""
    model = Image.galleries.through
    extra = 0
    verbose_name = "Image"
    verbose_name_plural = "Images"


@admin.register(UserGroup)
class UserGroupAdmin(admin.ModelAdmin):
    """Admin for UserGroup model."""
    list_display = ['name', 'member_count', 'created_at']
    search_fields = ['name', 'description']
    filter_horizontal = ['members']
    
    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = "Nombre de membres"


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    """Admin for Gallery model."""
    list_display = ['name', 'gallery_type', 'visibility', 'image_count', 'is_featured', 'created_at']
    list_filter = ['visibility', 'gallery_type', 'is_featured', 'created_at']
    search_fields = ['name', 'description', 'event_location']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ['allowed_groups']
    inlines = [ImageGalleryInline]
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'gallery_type')
        }),
        ('Événement', {
            'fields': ('event_key', 'event_date', 'event_location'),
            'classes': ('collapse',)
        }),
        ('Visibilité', {
            'fields': ('visibility', 'allowed_groups')
        }),
        ('Affichage', {
            'fields': ('cover_image', 'is_featured', 'display_order', 'allow_download')
        }),
        ('Métadonnées', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    """Admin for Image model."""
    list_display = ['__str__', 'get_galleries', 'display_order', 'is_featured', 'uploaded_at']
    list_filter = ['galleries', 'is_featured', 'uploaded_at']
    search_fields = ['title', 'description', 'galleries__name']
    readonly_fields = ['width', 'height', 'file_size', 'uploaded_at', 'updated_at']
    filter_horizontal = ['galleries']
    
    def get_galleries(self, obj):
        return ", ".join([g.name for g in obj.galleries.all()])
    get_galleries.short_description = "Galeries"
    
    fieldsets = (
        (None, {
            'fields': ('galleries', 'image', 'thumbnail', 'title', 'description', 'alt_text')
        }),
        ('Données techniques', {
            'fields': ('width', 'height', 'file_size'),
            'classes': ('collapse',)
        }),
        ('Données EXIF', {
            'fields': ('camera', 'lens', 'focal_length', 'aperture', 'shutter_speed', 'iso', 'taken_at'),
            'classes': ('collapse',)
        }),
        ('Affichage', {
            'fields': ('display_order', 'is_featured')
        }),
        ('Métadonnées', {
            'fields': ('uploaded_by', 'uploaded_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# =====================================================
# Print Request Admin
# =====================================================

class PrintRequestItemInline(admin.TabularInline):
    """Inline pour afficher les articles dans une demande d'impression."""
    model = PrintRequestItem
    extra = 0
    readonly_fields = ['image_preview', 'unit_price', 'estimated_price']
    fields = ['image_preview', 'image', 'print_size', 'quantity', 'custom_size', 'unit_price', 'estimated_price']
    
    def image_preview(self, obj):
        """Afficher une miniature de l'image."""
        if obj.image and obj.image.thumbnail:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.image.thumbnail.url
            )
        return "Pas d'aperçu"
    image_preview.short_description = "Aperçu"


@admin.register(PrintRequest)
class PrintRequestAdmin(admin.ModelAdmin):
    """Admin pour les demandes d'impression."""
    list_display = [
        'id', 'user', 'status', 'total_items', 'estimated_total_display',
        'created_at', 'updated_at'
    ]
    list_filter = ['status', 'created_at', 'updated_at']
    search_fields = ['user__username', 'user__email', 'notes', 'admin_notes']
    readonly_fields = ['user', 'created_at', 'updated_at', 'total_items', 'estimated_total']
    inlines = [PrintRequestItemInline]
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('user', 'status', 'created_at', 'updated_at')
        }),
        ('Détails', {
            'fields': ('total_items', 'estimated_total', 'notes')
        }),
        ('Notes administrateur', {
            'fields': ('admin_notes',),
            'classes': ('collapse',)
        }),
    )
    
    def estimated_total_display(self, obj):
        """Afficher le total estimé formaté."""
        return f"{obj.estimated_total:.2f} €"
    estimated_total_display.short_description = "Total estimé"
    estimated_total_display.admin_order_field = 'estimated_total'
    
    def has_add_permission(self, request):
        """Les demandes ne peuvent être créées que via l'API."""
        return False
    
    def get_readonly_fields(self, request, obj=None):
        """Certains champs ne sont pas modifiables après création."""
        readonly = list(self.readonly_fields)
        if obj:  # Si l'objet existe déjà
            readonly.extend(['user'])
        return readonly


@admin.register(PrintRequestItem)
class PrintRequestItemAdmin(admin.ModelAdmin):
    """Admin pour les articles individuels (optionnel, principalement géré via inline)."""
    list_display = [
        'id', 'request', 'image', 'print_size', 'quantity',
        'unit_price', 'estimated_price'
    ]
    list_filter = ['print_size', 'created_at']
    search_fields = ['request__user__username', 'image__title']
    readonly_fields = ['unit_price', 'estimated_price', 'created_at']
    
    def has_add_permission(self, request):
        """Les articles sont créés via PrintRequest."""
        return False
