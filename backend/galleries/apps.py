"""
App configuration for galleries.
"""

from django.apps import AppConfig


class GalleriesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'galleries'
    verbose_name = 'Galeries'
    
    def ready(self):
        """Import signals when the app is ready."""
        import galleries.signals
