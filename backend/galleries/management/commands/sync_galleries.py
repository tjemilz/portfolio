"""
Management command to sync galleries from physical folders.
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from galleries.models import Gallery, Image


class Command(BaseCommand):
    help = 'Synchronise les galeries depuis les dossiers physiques dans media/'
    
    # Mapping of folder names to gallery types
    FOLDER_TYPE_MAPPING = {
        'bestof': ('BESTOF', 'Best Of', 'Sélection des meilleures photos'),
        'bw': ('BW', 'Noir & Blanc', 'Collection de photos en noir et blanc'),
        'streets': ('STREETS', 'Street Photography', 'Photographie de rue'),
        'explore': ('EXPLORE', 'Exploration', 'Photos d\'exploration et de découverte'),
    }
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les actions sans les exécuter'
        )
        parser.add_argument(
            '--folder',
            type=str,
            help='Synchronise uniquement le dossier spécifié'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_folder = options.get('folder')
        
        media_root = settings.MEDIA_ROOT
        public_path = os.path.join(media_root, 'galleries', 'public')
        
        if not os.path.exists(public_path):
            self.stdout.write(self.style.WARNING(
                f"Le dossier {public_path} n'existe pas. Création..."
            ))
            if not dry_run:
                os.makedirs(public_path, exist_ok=True)
                for folder in self.FOLDER_TYPE_MAPPING.keys():
                    os.makedirs(os.path.join(public_path, folder), exist_ok=True)
            return
        
        # Process each folder
        folders_to_process = [specific_folder] if specific_folder else self.FOLDER_TYPE_MAPPING.keys()
        
        for folder_name in folders_to_process:
            if folder_name not in self.FOLDER_TYPE_MAPPING:
                self.stdout.write(self.style.ERROR(f"Dossier inconnu: {folder_name}"))
                continue
            
            folder_path = os.path.join(public_path, folder_name)
            
            if not os.path.exists(folder_path):
                self.stdout.write(self.style.WARNING(f"Dossier non trouvé: {folder_path}"))
                continue
            
            self.sync_folder(folder_name, folder_path, dry_run)
    
    def sync_folder(self, folder_name, folder_path, dry_run):
        """Synchronise un dossier de galerie."""
        gallery_type, name, description = self.FOLDER_TYPE_MAPPING[folder_name]
        
        self.stdout.write(f"Synchronisation de {folder_name}...")
        
        # Create or get gallery
        gallery, created = Gallery.objects.get_or_create(
            slug=folder_name,
            defaults={
                'name': name,
                'description': description,
                'gallery_type': gallery_type,
                'visibility': 'PUBLIC',
            }
        ) if not dry_run else (None, False)
        
        if dry_run:
            self.stdout.write(f"  [DRY RUN] Galerie: {name}")
        elif created:
            self.stdout.write(self.style.SUCCESS(f"  Galerie créée: {name}"))
        else:
            self.stdout.write(f"  Galerie existante: {name}")
        
        # Get image files
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        image_files = []
        
        for filename in os.listdir(folder_path):
            ext = os.path.splitext(filename)[1].lower()
            if ext in valid_extensions:
                image_files.append(filename)
        
        image_files.sort()
        self.stdout.write(f"  Images trouvées: {len(image_files)}")
        
        if dry_run:
            for img in image_files[:5]:
                self.stdout.write(f"    [DRY RUN] {img}")
            if len(image_files) > 5:
                self.stdout.write(f"    ... et {len(image_files) - 5} autres")
            return
        
        # Sync images
        existing_images = set(
            Image.objects.filter(galleries=gallery).values_list('image', flat=True)
        )
        
        added = 0
        for order, filename in enumerate(image_files):
            relative_path = f"galleries/public/{folder_name}/{filename}"
            
            if relative_path not in existing_images:
                # Check if image already exists (from another gallery)
                existing_image = Image.objects.filter(image=relative_path).first()
                if existing_image:
                    # Just add to this gallery
                    existing_image.galleries.add(gallery)
                    existing_image.display_order = order
                    existing_image.save()
                else:
                    # Create new image
                    image = Image.objects.create(
                        image=relative_path,
                        title=os.path.splitext(filename)[0],
                        display_order=order
                    )
                    image.galleries.add(gallery)
                added += 1
        
        self.stdout.write(self.style.SUCCESS(f"  Images ajoutées: {added}"))
