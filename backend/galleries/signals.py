"""
Signal handlers for automatic thumbnail generation and image optimization.
"""

import os
from PIL import Image as PILImage, ImageOps, ExifTags
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from io import BytesIO
from .models import Image


@receiver(post_save, sender=Image)
def create_thumbnail(sender, instance, created, **kwargs):
    """
    Generate thumbnail automatically when an image is uploaded.
    """
    # Seulement pour les nouvelles images ou si le thumbnail n'existe pas
    if not instance.image or (not created and instance.thumbnail):
        return
    
    try:
        # Open the uploaded image
        with PILImage.open(instance.image.path) as img:
            # Handle EXIF rotation
            img = ImageOps.exif_transpose(img)
            
            # Convert to RGB if necessary (for CMYK, P mode, etc.)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Create thumbnail - multiple sizes for different use cases
            thumbnail_sizes = {
                'thumbnail': (400, 400),  # For gallery grid
                'medium': (800, 800),     # For lightbox preview
            }
            
            # Generate the main thumbnail (400x400)
            thumb_size = thumbnail_sizes['thumbnail']
            img_thumb = img.copy()
            img_thumb.thumbnail(thumb_size, PILImage.Resampling.LANCZOS)
            
            # Save thumbnail to BytesIO
            thumb_io = BytesIO()
            img_thumb.save(thumb_io, format='JPEG', quality=85, optimize=True)
            thumb_io.seek(0)
            
            # Generate filename
            name, ext = os.path.splitext(instance.image.name)
            thumb_filename = f"{os.path.basename(name)}_thumb.jpg"
            
            # Save thumbnail
            instance.thumbnail.save(
                thumb_filename,
                ContentFile(thumb_io.getvalue()),
                save=False
            )
            
            # Update dimensions if not already set
            if not instance.width or not instance.height:
                instance.width = img.width
                instance.height = img.height
            
            # Save without triggering signals again
            instance.save(update_fields=['thumbnail', 'width', 'height'])
            
    except Exception as e:
        print(f"Error creating thumbnail for {instance.image.name}: {e}")


@receiver(post_save, sender=Image)
def extract_exif_data(sender, instance, created, **kwargs):
    """
    Extract EXIF data from uploaded images.
    """
    if not created or not instance.image:
        return
    
    try:
        with PILImage.open(instance.image.path) as img:
            exif_dict = img._getexif()
            
            if exif_dict is not None:
                # Create a dictionary of EXIF tags
                exif = {
                    ExifTags.TAGS[k]: v
                    for k, v in exif_dict.items()
                    if k in ExifTags.TAGS
                }
                
                # Extract relevant data
                updates = {}
                
                if 'Make' in exif and 'Model' in exif:
                    updates['camera'] = f"{exif['Make']} {exif['Model']}"
                
                if 'LensModel' in exif:
                    updates['lens'] = exif['LensModel']
                elif 'LensMake' in exif:
                    updates['lens'] = exif['LensMake']
                
                if 'FocalLength' in exif:
                    focal = exif['FocalLength']
                    if isinstance(focal, tuple) and len(focal) == 2:
                        updates['focal_length'] = f"{focal[0]/focal[1]:.0f}mm"
                    else:
                        updates['focal_length'] = f"{focal}mm"
                
                if 'FNumber' in exif:
                    f_num = exif['FNumber']
                    if isinstance(f_num, tuple) and len(f_num) == 2:
                        updates['aperture'] = f"f/{f_num[0]/f_num[1]:.1f}"
                    else:
                        updates['aperture'] = f"f/{f_num}"
                
                if 'ExposureTime' in exif:
                    exposure = exif['ExposureTime']
                    if isinstance(exposure, tuple) and len(exposure) == 2:
                        if exposure[1] > exposure[0]:
                            updates['shutter_speed'] = f"1/{exposure[1]//exposure[0]}s"
                        else:
                            updates['shutter_speed'] = f"{exposure[0]/exposure[1]}s"
                    else:
                        updates['shutter_speed'] = f"{exposure}s"
                
                if 'ISOSpeedRatings' in exif:
                    updates['iso'] = exif['ISOSpeedRatings']
                
                # Update the instance if we have data
                if updates:
                    for field, value in updates.items():
                        setattr(instance, field, value)
                    instance.save(update_fields=list(updates.keys()))
                    
    except Exception as e:
        print(f"Error extracting EXIF from {instance.image.name}: {e}")