"""
Serializers for galleries, images, access groups, and print requests.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AccessGroup, Gallery, Image, PrintRequest, PrintRequestItem

User = get_user_model()


class GalleryMinimalSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='title', read_only=True)
    
    class Meta:
        model = Gallery
        fields = ['id', 'title', 'name', 'slug']


class ImageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for images within galleries."""
    secure_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = [
            'id', 'title', 'secure_url', 'image_url', 'thumbnail_url',
            'width', 'height', 'display_order'
        ]
    
    def get_secure_url(self, obj):
        return f"/api/media/secure/{obj.id}/"
        
    def get_image_url(self, obj):
        return f"/api/media/secure/{obj.id}/"
        
    def get_thumbnail_url(self, obj):
        return f"/api/media/secure/{obj.id}/"


class ImageSerializer(serializers.ModelSerializer):
    """Detailed serializer for image inspection and upload."""
    file = serializers.ImageField(required=False)
    image = serializers.ImageField(source='file', required=False, write_only=True)
    secure_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    galleries = GalleryMinimalSerializer(many=True, read_only=True)
    gallery_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        source='galleries',
        queryset=Gallery.objects.all(),
        required=False
    )
    
    class Meta:
        model = Image
        fields = [
            'id', 'title', 'file', 'image', 'secure_url', 'image_url', 'thumbnail_url',
            'width', 'height', 'display_order', 'uploaded_at',
            'galleries', 'gallery_ids'
        ]
        read_only_fields = ['width', 'height', 'uploaded_at']
    
    def get_secure_url(self, obj):
        return f"/api/media/secure/{obj.id}/"
        
    def get_image_url(self, obj):
        return f"/api/media/secure/{obj.id}/"
        
    def get_thumbnail_url(self, obj):
        return f"/api/media/secure/{obj.id}/"


class GalleryListSerializer(serializers.ModelSerializer):
    """Serializer for gallery cards and listings."""
    name = serializers.CharField(source='title', read_only=True)
    cover_url = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'name', 'slug', 'description', 'gallery_type', 'visibility',
            'is_featured', 'show_in_navbar', 'display_order', 'allow_download',
            'cover_url', 'image_count', 'event_date', 'created_at'
        ]
    
    def get_cover_url(self, obj):
        first_image = obj.images.first()
        if first_image:
            return f"/api/media/secure/{first_image.id}/"
        return None
        
    def get_image_count(self, obj):
        return obj.images.count()


class GalleryDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single gallery views."""
    name = serializers.CharField(source='title', read_only=True)
    images = ImageListSerializer(many=True, read_only=True)
    cover_url = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    allowed_groups = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    allowed_group_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        source='allowed_groups',
        queryset=AccessGroup.objects.all(),
        required=False
    )
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'name', 'slug', 'description', 'gallery_type', 'visibility',
            'is_featured', 'show_in_navbar', 'display_order', 'allow_download',
            'event_date', 'cover_url', 'image_count', 'allowed_groups', 'allowed_group_ids',
            'images', 'created_at'
        ]
    
    def get_cover_url(self, obj):
        first_image = obj.images.first()
        if first_image:
            return f"/api/media/secure/{first_image.id}/"
        return None
        
    def get_image_count(self, obj):
        return obj.images.count()


class AccessGroupMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class AccessGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    members = AccessGroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        source='members',
        queryset=User.objects.all(),
        required=False
    )
    
    class Meta:
        model = AccessGroup
        fields = ['id', 'name', 'description', 'members', 'member_ids', 'member_count']
    
    def get_member_count(self, obj):
        return obj.members.count()


class PrintRequestItemSerializer(serializers.ModelSerializer):
    image_title = serializers.CharField(source='image.title', read_only=True)
    image_url = serializers.CharField(source='image.secure_url', read_only=True)
    unit_price = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    estimated_price = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    
    class Meta:
        model = PrintRequestItem
        fields = [
            'id', 'image', 'image_title', 'image_url', 'print_size',
            'quantity', 'custom_size', 'unit_price', 'estimated_price'
        ]


class PrintRequestItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintRequestItem
        fields = ['image', 'print_size', 'quantity', 'custom_size']


class PrintRequestSerializer(serializers.ModelSerializer):
    items = PrintRequestItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    estimated_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = PrintRequest
        fields = [
            'id', 'user', 'user_email', 'user_name', 'status',
            'notes', 'admin_notes', 'items', 'total_items',
            'estimated_total', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class PrintRequestCreateSerializer(serializers.ModelSerializer):
    items = PrintRequestItemCreateSerializer(many=True)
    
    class Meta:
        model = PrintRequest
        fields = ['id', 'status', 'notes', 'items', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
        
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        request_obj = PrintRequest.objects.create(user=user, **validated_data)
        for item_data in items_data:
            PrintRequestItem.objects.create(request=request_obj, **item_data)
        return request_obj
