#!/usr/bin/env python
"""
Test runner script for groups and permissions.
This script runs comprehensive tests for user groups and permissions.
"""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner
from django.core.management import execute_from_command_line
import subprocess
from datetime import datetime


def setup_django():
    """Set up Django environment."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings')
    django.setup()


def run_tests_with_coverage():
    """Run tests with detailed output and coverage if available."""
    
    print("=" * 60)
    print("TESTS POUR LES GROUPES ET PRIVILÈGES")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # List of test modules to run
    test_modules = [
        'galleries.tests.UserGroupModelTest',
        'galleries.tests.GalleryPermissionsTest', 
        'galleries.tests.GalleryPermissionsAPITest',
        'galleries.tests.ImageUploadPermissionsTest',
        'galleries.tests.GroupManagementPermissionsTest',
        'galleries.tests.EdgeCasesTest',
        'authentication.tests.UserAuthenticationTest',
        'authentication.tests.UserPermissionsTest',
        'authentication.tests.UserModelTest',
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_module in test_modules:
        print(f"\n📋 Exécution: {test_module}")
        print("-" * 50)
        
        try:
            # Run individual test module
            result = subprocess.run([
                sys.executable, 'manage.py', 'test', test_module, 
                '--verbosity=2', '--keepdb'
            ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
            
            output = result.stdout + result.stderr
            print(output)
            
            if result.returncode == 0:
                print(f"✅ {test_module} - SUCCÈS")
                passed_tests += 1
            else:
                print(f"❌ {test_module} - ÉCHEC")
                failed_tests += 1
                
            total_tests += 1
            
        except Exception as e:
            print(f"❌ Erreur lors de l'exécution de {test_module}: {str(e)}")
            failed_tests += 1
            total_tests += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("RÉSUMÉ DES TESTS")
    print("=" * 60)
    print(f"Tests exécutés: {total_tests}")
    print(f"Tests réussis: {passed_tests} ✅")
    print(f"Tests échoués: {failed_tests} ❌")
    print(f"Taux de réussite: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
    print()
    
    return failed_tests == 0


def run_specific_permission_tests():
    """Run specific permission-related tests."""
    print("\n🔐 TESTS SPÉCIFIQUES AUX PERMISSIONS")
    print("=" * 60)
    
    # Test commands to verify permissions
    test_commands = [
        {
            'name': 'Vérification des modèles',
            'command': ['python', 'manage.py', 'check'],
            'description': 'Vérifie que les modèles sont correctement configurés'
        },
        {
            'name': 'Migrations en attente',
            'command': ['python', 'manage.py', 'showmigrations', '--plan'],
            'description': 'Vérifie s\'il y a des migrations en attente'
        },
        {
            'name': 'Structure de la base de données',
            'command': ['python', 'manage.py', 'inspectdb'],
            'description': 'Inspecte la structure de la base de données (aperçu)'
        }
    ]
    
    for test in test_commands:
        print(f"\n📊 {test['name']}")
        print(f"Description: {test['description']}")
        print("-" * 40)
        
        try:
            result = subprocess.run(
                test['command'], 
                capture_output=True, 
                text=True, 
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            
            if result.returncode == 0:
                output = result.stdout[:500] + "..." if len(result.stdout) > 500 else result.stdout
                print(output)
                print("✅ Succès")
            else:
                print(f"❌ Erreur: {result.stderr}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")


def create_test_data():
    """Create test data for manual verification."""
    print("\n🏗️ CRÉATION DE DONNÉES DE TEST")
    print("=" * 60)
    
    test_script = """
from django.contrib.auth.models import User
from galleries.models import UserGroup, Gallery

# Créer des utilisateurs de test
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

user1, created = User.objects.get_or_create(
    username='test_user1',
    defaults={'email': 'user1@test.com'}
)
if created:
    user1.set_password('user123')
    user1.save()

user2, created = User.objects.get_or_create(
    username='test_user2',
    defaults={'email': 'user2@test.com'}
)
if created:
    user2.set_password('user123')
    user2.save()

# Créer des groupes de test
family_group, created = UserGroup.objects.get_or_create(
    name='Test Famille',
    defaults={'description': 'Groupe de test pour la famille'}
)
if created:
    family_group.members.add(user1)

friends_group, created = UserGroup.objects.get_or_create(
    name='Test Amis',
    defaults={'description': 'Groupe de test pour les amis'}
)
if created:
    friends_group.members.add(user2)

# Créer des galeries de test
public_gallery, created = Gallery.objects.get_or_create(
    slug='test-public',
    defaults={
        'name': 'Galerie Publique Test',
        'visibility': 'PUBLIC',
        'created_by': admin_user
    }
)

private_gallery, created = Gallery.objects.get_or_create(
    slug='test-private',
    defaults={
        'name': 'Galerie Privée Test',
        'visibility': 'PRIVATE',
        'created_by': admin_user
    }
)
if created:
    private_gallery.allowed_groups.add(family_group)

print("✅ Données de test créées:")
print(f"  - Admin: {admin_user.username}")
print(f"  - User1 (famille): {user1.username}")
print(f"  - User2 (amis): {user2.username}")
print(f"  - Groupe famille: {family_group.name} ({family_group.members.count()} membres)")
print(f"  - Groupe amis: {friends_group.name} ({friends_group.members.count()} membres)")
print(f"  - Galerie publique: {public_gallery.name}")
print(f"  - Galerie privée: {private_gallery.name} (groupes autorisés: {private_gallery.allowed_groups.count()})")
"""
    
    try:
        # Write and execute test data creation script
        with open('create_test_data.py', 'w', encoding='utf-8') as f:
            f.write(test_script)
        
        result = subprocess.run([
            sys.executable, 'manage.py', 'shell', '--command', 
            'exec(open("create_test_data.py").read())'
        ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        
        if result.returncode == 0:
            print(result.stdout)
            print("✅ Données de test créées avec succès")
        else:
            print(f"❌ Erreur lors de la création des données de test: {result.stderr}")
            
        # Clean up
        try:
            os.remove('create_test_data.py')
        except:
            pass
            
    except Exception as e:
        print(f"❌ Exception lors de la création des données de test: {str(e)}")


def main():
    """Main test runner function."""
    if __name__ == '__main__':
        # Change to the backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        
        # Setup Django
        setup_django()
        
        print("🚀 DÉMARRAGE DES TESTS DE GROUPES ET PRIVILÈGES")
        print("=" * 60)
        
        # Run the tests
        success = run_tests_with_coverage()
        
        # Run specific checks
        run_specific_permission_tests()
        
        # Create test data for manual verification
        create_test_data()
        
        print("\n" + "=" * 60)
        print("RECOMMANDATIONS POUR LES TESTS MANUELS")
        print("=" * 60)
        print("1. Connectez-vous à l'admin Django avec test_admin/admin123")
        print("2. Vérifiez que vous pouvez voir les groupes et galeries")
        print("3. Testez l'accès aux galeries avec test_user1/user123 et test_user2/user123")
        print("4. Vérifiez que test_user1 peut voir la galerie privée (membre du groupe famille)")
        print("5. Vérifiez que test_user2 ne peut pas voir la galerie privée")
        print("6. Testez l'upload d'images (réservé aux admins)")
        print("7. Testez les API endpoints avec curl ou Postman")
        print()
        
        if success:
            print("🎉 TOUS LES TESTS ONT RÉUSSI!")
            return 0
        else:
            print("⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIEZ LES DÉTAILS CI-DESSUS")
            return 1


if __name__ == '__main__':
    sys.exit(main())