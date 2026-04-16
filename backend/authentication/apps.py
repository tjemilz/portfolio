"""
App configuration for authentication.
"""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'
    verbose_name = 'Authentification'
    
    def ready(self):
        """Import signals when the app is ready."""
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass
