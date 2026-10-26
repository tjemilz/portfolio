"""
Signal handlers for automatic image dimension calculation and optimization.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.images import get_image_dimensions
from .models import Image


@receiver(post_save, sender=Image)
def compute_image_dimensions(sender, instance, created, **kwargs):
    """
    Computes and stores width and height if not already populated.
    """
    if instance.file and (not instance.width or not instance.height):
        try:
            width, height = get_image_dimensions(instance.file)
            if width and height:
                Image.objects.filter(pk=instance.pk).update(width=width, height=height)
        except Exception:
            pass
