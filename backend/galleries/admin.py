"""
Admin configuration for galleries app.
"""

from django.contrib import admin
from .models import UserGroup, Gallery, Image


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
