"""
Management command to generate thumbnails for existing images.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from galleries.models import Image
from galleries.signals import create_thumbnail
import os


class Command(BaseCommand):
    help = 'Generate thumbnails for existing images that don\'t have them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regenerate thumbnails even if they already exist',
        )
        parser.add_argument(
            '--image-id',
            type=int,
            help='Generate thumbnail for a specific image ID',
        )

    def handle(self, *args, **options):
        force = options['force']
        image_id = options.get('image_id')
        
        if image_id:
            # Process specific image
            try:
                image = Image.objects.get(id=image_id)
                images = [image]
                self.stdout.write(f'Processing image ID {image_id}: {image.image.name}')
            except Image.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Image with ID {image_id} not found')
                )
                return
        else:
            # Process all images
            if force:
                images = Image.objects.filter(image__isnull=False)
                self.stdout.write('Processing all images (force mode)')
            else:
                images = Image.objects.filter(image__isnull=False, thumbnail='')
                self.stdout.write('Processing images without thumbnails')

        if not images:
            self.stdout.write(
                self.style.WARNING('No images to process')
            )
            return

        self.stdout.write(f'Found {len(images)} images to process')

        success_count = 0
        error_count = 0

        for image in images:
            try:
                # Check if image file exists
                if not os.path.exists(image.image.path):
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Image file not found: {image.image.name}')
                    )
                    continue

                # Clear existing thumbnail if force mode
                if force and image.thumbnail:
                    if os.path.exists(image.thumbnail.path):
                        os.remove(image.thumbnail.path)
                    image.thumbnail.delete(save=False)

                # Generate thumbnail using the signal function
                create_thumbnail(Image, image, created=False)
                
                if image.thumbnail:
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Generated thumbnail for: {image.image.name}')
                    )
                    success_count += 1
                else:
                    self.stdout.write(
                        self.style.ERROR(f'✗ Failed to generate thumbnail for: {image.image.name}')
                    )
                    error_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Error processing {image.image.name}: {str(e)}')
                )
                error_count += 1

        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'✅ Successfully processed: {success_count} images'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errors: {error_count} images'))
        self.stdout.write('='*50)