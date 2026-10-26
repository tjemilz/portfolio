"""
Admin interface configuration for galleries, media management, and print requests.
"""

from django.contrib import admin
from django.core.files.images import get_image_dimensions
from .models import AccessGroup, Gallery, Image, PrintRequest, PrintRequestItem


@admin.register(AccessGroup)
class AccessGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_member_count')
    search_fields = ('name',)
    filter_horizontal = ('members',)
    
    def get_member_count(self, obj):
        return obj.members.count()
    get_member_count.short_description = 'Members Count'


class ImageInline(admin.TabularInline):
    model = Image.galleries.through
    extra = 1


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'visibility', 'gallery_type', 'created_at')
    list_filter = ('visibility', 'gallery_type', 'created_at')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ('allowed_groups',)
    inlines = [ImageInline]


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ('title', 'id', 'width', 'height', 'uploaded_at')
    list_filter = ('uploaded_at', 'galleries')
    search_fields = ('title',)
    filter_horizontal = ('galleries',)
    readonly_fields = ('width', 'height')
    
    def save_model(self, request, obj, form, change):
        if obj.file and (not obj.width or not obj.height):
            width, height = get_image_dimensions(obj.file)
            if width and height:
                obj.width = width
                obj.height = height
        super().save_model(request, obj, form, change)


class PrintRequestItemInline(admin.TabularInline):
    model = PrintRequestItem
    extra = 0
    readonly_fields = ('image', 'print_size', 'quantity', 'custom_size', 'estimated_price')


@admin.register(PrintRequest)
class PrintRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_items', 'estimated_total', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'notes')
    inlines = [PrintRequestItemInline]
