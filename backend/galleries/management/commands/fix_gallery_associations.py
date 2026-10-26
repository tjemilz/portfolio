"""
Management command to fix gallery associations based on image file paths.
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from galleries.models import Gallery, Image


class Command(BaseCommand):
    help = 'Répare les associations galeries/images basées sur les chemins des fichiers'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les actions sans les exécuter'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get all images
        images = Image.objects.all()
        fixed = 0
        
        self.stdout.write(f"Analyse de {images.count()} images...")
        
        for image in images:
            if not image.image:
                continue
            
            # Parse the path to find the gallery
            # Expected format: galleries/public/{gallery_slug}/filename.jpg
            # or: galleries/private/{gallery_slug}/filename.jpg
            path_parts = image.image.name.split('/')
            
            if len(path_parts) >= 3 and path_parts[0] == 'galleries':
                gallery_slug = path_parts[2]  # e.g., 'bw', 'streets', 'explore'
                
                try:
                    gallery = Gallery.objects.get(slug=gallery_slug)
                    
                    # Check if already associated
                    if not image.galleries.filter(id=gallery.id).exists():
                        if dry_run:
                            self.stdout.write(f"  [DRY RUN] {image.image.name} -> {gallery.name}")
                        else:
                            image.galleries.add(gallery)
                            self.stdout.write(self.style.SUCCESS(
                                f"  Fixed: {image.image.name} -> {gallery.name}"
                            ))
                        fixed += 1
                except Gallery.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f"  Galerie non trouvée: {gallery_slug} pour {image.image.name}"
                    ))
        
        self.stdout.write(self.style.SUCCESS(f"\nTotal: {fixed} associations {'à créer' if dry_run else 'créées'}"))
