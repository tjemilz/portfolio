#!/usr/bin/env python
"""
Script pour créer des données de test pour les groupes et permissions.
À exécuter avec: python manage.py shell < create_test_data.py
"""

from django.contrib.auth import get_user_model
from galleries.models import UserGroup, Gallery

User = get_user_model()

print("🏗️ Création des données de test pour les groupes et privilèges...")

# Créer des utilisateurs de test
print("\n👥 Création des utilisateurs...")

# Admin
admin_user, created = User.objects.get_or_create(
    username='test_admin',
    defaults={
        'email': 'admin@test.com',
        'is_staff': True,
        'is_superuser': True
    }
)
if created:
    admin_user.set_password('admin123')
    admin_user.save()
    print(f"✅ Admin créé: {admin_user.username}")
else:
    print(f"ℹ️ Admin existe déjà: {admin_user.username}")

# Utilisateur 1 (famille)
user1, created = User.objects.get_or_create(
    username='test_user1',
    defaults={'email': 'user1@test.com'}
)
if created:
    user1.set_password('user123')
    user1.save()
    print(f"✅ User1 créé: {user1.username}")
else:
    print(f"ℹ️ User1 existe déjà: {user1.username}")

# Utilisateur 2 (amis)
user2, created = User.objects.get_or_create(
    username='test_user2',
    defaults={'email': 'user2@test.com'}
)
if created:
    user2.set_password('user123')
    user2.save()
    print(f"✅ User2 créé: {user2.username}")
else:
    print(f"ℹ️ User2 existe déjà: {user2.username}")

# Créer des groupes de test
print("\n👥 Création des groupes...")

# Groupe famille
family_group, created = UserGroup.objects.get_or_create(
    name='Test Famille',
    defaults={'description': 'Groupe de test pour la famille'}
)
if created:
    family_group.members.add(user1)
    print(f"✅ Groupe famille créé: {family_group.name}")
else:
    if user1 not in family_group.members.all():
        family_group.members.add(user1)
    print(f"ℹ️ Groupe famille existe déjà: {family_group.name}")

# Groupe amis
friends_group, created = UserGroup.objects.get_or_create(
    name='Test Amis',
    defaults={'description': 'Groupe de test pour les amis'}
)
if created:
    friends_group.members.add(user2)
    print(f"✅ Groupe amis créé: {friends_group.name}")
else:
    if user2 not in friends_group.members.all():
        friends_group.members.add(user2)
    print(f"ℹ️ Groupe amis existe déjà: {friends_group.name}")

# Créer des galeries de test
print("\n🖼️ Création des galeries...")

# Galerie publique
public_gallery, created = Gallery.objects.get_or_create(
    slug='test-public',
    defaults={
        'name': 'Galerie Publique Test',
        'visibility': Gallery.Visibility.PUBLIC,
        'created_by': admin_user,
        'description': 'Galerie publique accessible à tous'
    }
)
if created:
    print(f"✅ Galerie publique créée: {public_gallery.name}")
else:
    print(f"ℹ️ Galerie publique existe déjà: {public_gallery.name}")

# Galerie privée famille
private_gallery, created = Gallery.objects.get_or_create(
    slug='test-private-famille',
    defaults={
        'name': 'Galerie Privée Famille',
        'visibility': Gallery.Visibility.PRIVATE,
        'created_by': admin_user,
        'description': 'Galerie privée réservée à la famille'
    }
)
if created:
    private_gallery.allowed_groups.add(family_group)
    print(f"✅ Galerie privée famille créée: {private_gallery.name}")
else:
    if family_group not in private_gallery.allowed_groups.all():
        private_gallery.allowed_groups.add(family_group)
    print(f"ℹ️ Galerie privée famille existe déjà: {private_gallery.name}")

# Galerie privée amis
friends_gallery, created = Gallery.objects.get_or_create(
    slug='test-private-amis',
    defaults={
        'name': 'Galerie Privée Amis',
        'visibility': Gallery.Visibility.PRIVATE,
        'created_by': admin_user,
        'description': 'Galerie privée réservée aux amis'
    }
)
if created:
    friends_gallery.allowed_groups.add(friends_group)
    print(f"✅ Galerie privée amis créée: {friends_gallery.name}")
else:
    if friends_group not in friends_gallery.allowed_groups.all():
        friends_gallery.allowed_groups.add(friends_group)
    print(f"ℹ️ Galerie privée amis existe déjà: {friends_gallery.name}")

# Galerie privée sans groupe (seulement admins)
admin_gallery, created = Gallery.objects.get_or_create(
    slug='test-admin-only',
    defaults={
        'name': 'Galerie Admin Seulement',
        'visibility': Gallery.Visibility.PRIVATE,
        'created_by': admin_user,
        'description': 'Galerie privée accessible seulement aux admins'
    }
)
if created:
    print(f"✅ Galerie admin créée: {admin_gallery.name}")
else:
    print(f"ℹ️ Galerie admin existe déjà: {admin_gallery.name}")

# Afficher le résumé
print("\n" + "="*60)
print("RÉSUMÉ DES DONNÉES DE TEST CRÉÉES")
print("="*60)
print(f"👤 Utilisateurs:")
print(f"  - Admin: {admin_user.username} (staff={admin_user.is_staff}, superuser={admin_user.is_superuser})")
print(f"  - User1: {user1.username} (groupes: {', '.join([g.name for g in user1.gallery_groups.all()])})")
print(f"  - User2: {user2.username} (groupes: {', '.join([g.name for g in user2.gallery_groups.all()])})")

print(f"\n👥 Groupes:")
print(f"  - {family_group.name}: {family_group.members.count()} membres")
print(f"  - {friends_group.name}: {friends_group.members.count()} membres")

print(f"\n🖼️ Galeries:")
print(f"  - {public_gallery.name}: {public_gallery.visibility} (accessible à tous)")
print(f"  - {private_gallery.name}: {private_gallery.visibility} (groupes: {private_gallery.allowed_groups.count()})")
print(f"  - {friends_gallery.name}: {friends_gallery.visibility} (groupes: {friends_gallery.allowed_groups.count()})")
print(f"  - {admin_gallery.name}: {admin_gallery.visibility} (admin seulement)")

print(f"\n🔐 Tests de permissions:")
print(f"  - user1 peut voir galerie famille: {private_gallery.can_access(user1)}")
print(f"  - user1 peut voir galerie amis: {friends_gallery.can_access(user1)}")
print(f"  - user2 peut voir galerie famille: {private_gallery.can_access(user2)}")
print(f"  - user2 peut voir galerie amis: {friends_gallery.can_access(user2)}")
print(f"  - user1 peut voir galerie admin: {admin_gallery.can_access(user1)}")
print(f"  - admin peut voir toutes les galeries: {all([g.can_access(admin_user) for g in [public_gallery, private_gallery, friends_gallery, admin_gallery]])}")

print("\n🎯 Pour tester manuellement:")
print("1. Connectez-vous à l'admin: http://localhost:8000/admin/")
print("   - Admin: test_admin / admin123")
print("2. Testez les API endpoints:")
print("   - GET /api/galleries/ (anonyme)")
print("   - GET /api/galleries/ (avec auth user1)")
print("   - GET /api/galleries/ (avec auth user2)")
print("3. Testez l'accès aux galeries privées:")
print("   - /api/galleries/test-private-famille/")
print("   - /api/galleries/test-private-amis/")
print("   - /api/galleries/test-admin-only/")

print("\n✅ Données de test créées avec succès!")