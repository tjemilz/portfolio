"""
Management command to create default galleries including 'best-of'.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from galleries.models import Gallery

class Command(BaseCommand):
    help = 'Create default galleries including best-of gallery'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Recreate galleries if they already exist',
        )

    def handle(self, *args, **options):
        default_galleries = [
            {
                'name': 'Best Of',
                'slug': 'best-of',
                'description': 'Sélection des meilleures photos',
                'gallery_type': 'BESTOF',
                'visibility': 'PUBLIC'
            }
        ]

        with transaction.atomic():
            for gallery_data in default_galleries:
                gallery, created = Gallery.objects.get_or_create(
                    slug=gallery_data['slug'],
                    defaults=gallery_data
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Galerie "{gallery.name}" créée avec le slug "{gallery.slug}"')
                    )
                elif options['recreate']:
                    Gallery.objects.filter(slug=gallery_data['slug']).update(**gallery_data)
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Galerie "{gallery.name}" mise à jour')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Galerie "{gallery.name}" existe déjà (utilisez --recreate pour la mettre à jour)')
                    )

        self.stdout.write(
            self.style.SUCCESS('\n✅ Toutes les galeries par défaut ont été traitées.')
        )