"""
Serializers for galleries app.
"""

from rest_framework import serializers
from .models import UserGroup, Gallery, Image


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
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
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
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
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
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        # Return first image as cover if no cover set
        first_image = obj.images.first()
        if first_image and first_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
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
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
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
