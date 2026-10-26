"""
Management command to create or update an administrator account.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update an administrator account'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin', help='Admin username')
        parser.add_argument('--email', default='admin@still24.fr', help='Admin email')
        parser.add_argument('--password', default='admin123456', help='Admin password')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': User.UserRole.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )

        user.email = email
        user.role = User.UserRole.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "créé" if created else "mis à jour"
        self.stdout.write(
            self.style.SUCCESS(f"✓ Administrateur '{username}' ({email}) {action} avec succès.")
        )
