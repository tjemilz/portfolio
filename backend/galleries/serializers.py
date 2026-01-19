"""
Serializers for galleries app.
"""

from rest_framework import serializers
from .models import UserGroup, Gallery, Image, PrintRequest, PrintRequestItem, PrintSize


class GalleryMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for gallery references in images."""
    class Meta:
        model = Gallery
        fields = ['id', 'name', 'slug']


class ImageSerializer(serializers.ModelSerializer):
    """Serializer for Image model."""
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    galleries = GalleryMinimalSerializer(many=True, read_only=True)
    gallery_ids = serializers.PrimaryKeyRelatedField(
        queryset=Gallery.objects.all(),
        many=True,
        write_only=True,
        source='galleries',
        required=False
    )
    
    class Meta:
        model = Image
        fields = [
            'id', 'title', 'description', 'alt_text',
            'image', 'image_url', 'thumbnail', 'thumbnail_url',
            'width', 'height', 'file_size',
            'camera', 'lens', 'focal_length', 'aperture', 
            'shutter_speed', 'iso', 'taken_at',
            'display_order', 'is_featured', 'uploaded_at',
            'galleries', 'gallery_ids'
        ]
        read_only_fields = ['width', 'height', 'file_size', 'uploaded_at']
    
    def get_image_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.image:
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.thumbnail:
            return obj.thumbnail.url
        return None


class ImageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for image lists."""
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    galleries = GalleryMinimalSerializer(many=True, read_only=True)
    
    class Meta:
        model = Image
        fields = ['id', 'title', 'image_url', 'thumbnail_url', 'width', 'height', 'is_featured', 'galleries']
    
    def get_image_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.image:
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.thumbnail:
            return obj.thumbnail.url
        return None


class GalleryListSerializer(serializers.ModelSerializer):
    """Serializer for gallery lists."""
    cover_url = serializers.SerializerMethodField()
    image_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'name', 'slug', 'description', 
            'gallery_type', 'visibility', 'cover_url',
            'image_count', 'is_featured', 'created_at'
        ]
    
    def get_cover_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.cover_image:
            return obj.cover_image.url
        # Return first image as cover if no cover set
        first_image = obj.images.first()
        if first_image and first_image.image:
            return first_image.image.url
        return None


class GalleryDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single gallery view."""
    images = ImageListSerializer(many=True, read_only=True)
    cover_url = serializers.SerializerMethodField()
    image_count = serializers.IntegerField(read_only=True)
    allowed_groups = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'name', 'slug', 'description', 
            'gallery_type', 'visibility', 
            'event_date', 'event_location',
            'cover_url', 'image_count', 
            'is_featured', 'allow_download',
            'allowed_groups',
            'images', 'created_at', 'updated_at'
        ]
    
    def get_cover_url(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.cover_image:
            return obj.cover_image.url
        return None


class GalleryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating galleries."""
    
    class Meta:
        model = Gallery
        fields = [
            'name', 'slug', 'description', 'gallery_type',
            'event_key', 'event_date', 'event_location',
            'visibility', 'allowed_groups', 'cover_image',
            'is_featured', 'display_order', 'allow_download'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class UserGroupMemberSerializer(serializers.Serializer):
    """Minimal serializer for group members."""
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


class UserGroupSerializer(serializers.ModelSerializer):
    """Serializer for UserGroup model."""
    member_count = serializers.SerializerMethodField()
    members = UserGroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = UserGroup
        fields = ['id', 'name', 'description', 'members', 'member_ids', 'member_count', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        group = UserGroup.objects.create(**validated_data)
        if member_ids:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            members = User.objects.filter(id__in=member_ids)
            group.members.set(members)
        return group
    
    def update(self, instance, validated_data):
        member_ids = validated_data.pop('member_ids', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()
        
        if member_ids is not None:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            members = User.objects.filter(id__in=member_ids)
            instance.members.set(members)
        
        return instance


# =====================================================
# Print Request Serializers
# =====================================================

class PrintRequestItemSerializer(serializers.ModelSerializer):
    """Serializer for individual print items."""
    image_title = serializers.CharField(source='image.title', read_only=True)
    image_thumbnail = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    estimated_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    print_size_display = serializers.CharField(source='get_print_size_display', read_only=True)
    
    class Meta:
        model = PrintRequestItem
        fields = [
            'id', 'image', 'image_title', 'image_thumbnail',
            'print_size', 'print_size_display', 'quantity',
            'custom_size', 'unit_price', 'estimated_price',
            'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_image_thumbnail(self, obj):
        """Return relative URL - nginx serves /media/ correctly."""
        if obj.image.thumbnail:
            return obj.image.thumbnail.url
        elif obj.image.image:
            return obj.image.image.url
        return None
    
    def validate(self, data):
        """Validate that custom_size is provided when print_size is OTHER."""
        if data.get('print_size') == PrintSize.OTHER and not data.get('custom_size'):
            raise serializers.ValidationError({
                'custom_size': 'Le format personnalisé doit être spécifié pour l\'option "Autre".'
            })
        return data


class PrintRequestSerializer(serializers.ModelSerializer):
    """Serializer for print requests with items."""
    items = PrintRequestItemSerializer(many=True, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    estimated_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = PrintRequest
        fields = [
            'id', 'user', 'user_username', 'user_email',
            'status', 'status_display', 'notes', 'admin_notes',
            'items', 'total_items', 'estimated_total',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']


class PrintRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating print requests."""
    items = PrintRequestItemSerializer(many=True)
    
    class Meta:
        model = PrintRequest
        fields = ['notes', 'items']
    
    def create(self, validated_data):
        """Create a print request with items."""
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        # Create the print request
        print_request = PrintRequest.objects.create(
            user=user,
            **validated_data
        )
        
        # Create the items
        for item_data in items_data:
            PrintRequestItem.objects.create(
                request=print_request,
                **item_data
            )
        
        return print_request
    
    def validate_items(self, items):
        """Validate that at least one item is provided."""
        if not items:
            raise serializers.ValidationError("Au moins un article doit être sélectionné.")
        return items
