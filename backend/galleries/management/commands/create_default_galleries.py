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
                'title': 'Best Of',
                'slug': 'best-of',
                'description': 'Sélection des meilleures photos',
                'gallery_type': 'BESTOF',
                'visibility': 'PUBLIC',
                'show_in_navbar': True,
                'is_featured': True,
                'display_order': 0,
            },
            {
                'title': 'Noir & Blanc',
                'slug': 'noir-et-blanc',
                'description': 'Collection de photos en noir et blanc',
                'gallery_type': 'BW',
                'visibility': 'PUBLIC',
                'show_in_navbar': True,
                'is_featured': True,
                'display_order': 1,
            },
            {
                'title': 'Street Photography',
                'slug': 'street-photography',
                'description': 'Photographie de rue et scènes urbaines',
                'gallery_type': 'STREETS',
                'visibility': 'PUBLIC',
                'show_in_navbar': True,
                'is_featured': True,
                'display_order': 2,
            },
            {
                'title': 'Exploration',
                'slug': 'exploration',
                'description': "Photos d'exploration et de découverte",
                'gallery_type': 'EXPLORE',
                'visibility': 'PUBLIC',
                'show_in_navbar': True,
                'is_featured': True,
                'display_order': 3,
            },
        ]

        with transaction.atomic():
            for gallery_data in default_galleries:
                gallery, created = Gallery.objects.get_or_create(
                    slug=gallery_data['slug'],
                    defaults=gallery_data
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Galerie "{gallery.title}" créée avec le slug "{gallery.slug}"')
                    )
                elif options['recreate']:
                    Gallery.objects.filter(slug=gallery_data['slug']).update(**gallery_data)
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Galerie "{gallery.title}" mise à jour')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Galerie "{gallery.title}" existe déjà (utilisez --recreate pour la mettre à jour)')
                    )

        self.stdout.write(
            self.style.SUCCESS('\n✅ Toutes les galeries par défaut ont été traitées.')
        )
