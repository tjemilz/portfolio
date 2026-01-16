# Tests des Groupes et Privilèges

## Vue d'ensemble

Ce document décrit la stratégie de test complète pour le système de groupes d'utilisateurs et de permissions de l'application portfolio.

## Architecture des Permissions

### Modèles Impliqués

1. **UserGroup** (`galleries/models.py`)
   - Groupes d'utilisateurs avec membres (ManyToMany vers User)
   - Utilisé pour contrôler l'accès aux galeries privées

2. **Gallery** (`galleries/models.py`)
   - Visibilité: PUBLIC ou PRIVATE
   - `allowed_groups`: ManyToMany vers UserGroup pour les galeries privées
   - Méthode `can_access(user)` pour vérifier les permissions

3. **Custom Permissions** (`galleries/permissions.py`)
   - `CanAccessGallery`: Contrôle l'accès aux galeries
   - `CanUploadImage`: Upload réservé aux staff/admin
   - `CanDeleteImage`: Suppression réservée aux staff/admin
   - `IsAdminOrReadOnly`: Lecture libre, écriture admin uniquement

### Règles de Permission

#### Accès aux Galeries
- **Galeries Publiques**: Accessibles à tous (même anonymes)
- **Galeries Privées**: 
  - Utilisateurs authentifiés + membre d'un groupe autorisé
  - Staff/Admin: accès total
  - Anonymes: aucun accès

#### Gestion des Images
- **Upload**: Staff/Admin uniquement
- **Suppression**: Staff/Admin uniquement
- **Visualisation**: Selon les règles d'accès à la galerie

#### Gestion des Groupes
- **Création/Modification**: Admin uniquement
- **Ajout/Retrait de membres**: Admin uniquement

## Tests Implémentés

### 1. Tests du Modèle UserGroup (`UserGroupModelTest`)

```python
- test_create_user_group()           # Création basique de groupe
- test_add_members_to_group()        # Ajout de membres
- test_user_groups_relationship()    # Relation inverse User -> Groups
```

### 2. Tests des Permissions de Galerie (`GalleryPermissionsTest`)

```python
- test_public_gallery_access()                    # Accès galerie publique
- test_private_gallery_access_with_group_membership()  # Accès selon groupes
- test_private_gallery_access_without_authentication() # Accès anonyme
- test_staff_user_access_to_private_gallery()     # Accès staff
- test_multiple_groups_for_gallery()              # Plusieurs groupes par galerie
- test_user_in_multiple_groups()                  # Utilisateur dans plusieurs groupes
```

### 3. Tests API des Permissions (`GalleryPermissionsAPITest`)

```python
- test_anonymous_user_gallery_list()    # Liste galeries pour anonyme
- test_authenticated_user_gallery_list() # Liste selon groupes
- test_private_gallery_detail_access()   # Accès détail galerie privée
- test_admin_only_operations()           # Opérations réservées admin
```

### 4. Tests Upload d'Images (`ImageUploadPermissionsTest`)

```python
- test_image_upload_permissions()    # Permissions upload
- test_image_delete_permissions()    # Permissions suppression
```

### 5. Tests de Cas Limites (`EdgeCasesTest`)

```python
- test_gallery_with_no_allowed_groups()  # Galerie privée sans groupes
- test_empty_user_group()                # Groupe vide
- test_user_removed_from_group()         # Retrait d'un groupe
- test_gallery_visibility_change()       # Changement de visibilité
```

## Exécution des Tests

### Tests Automatiques

```bash
# Tous les tests
python manage.py test galleries.tests authentication.tests --verbosity=2

# Tests spécifiques aux permissions
python manage.py test galleries.tests.GalleryPermissionsTest --verbosity=2

# Script de test complet
python run_permission_tests.py
```

### Tests Manuels Recommandés

#### 1. Test Admin Django
1. Connectez-vous à `/admin/` avec un compte admin
2. Vérifiez la gestion des UserGroups
3. Créez/modifiez des galeries privées
4. Assignez des groupes aux galeries

#### 2. Test API Frontend
1. Testez l'accès aux galeries selon l'authentification
2. Vérifiez que les galeries privées n'apparaissent pas sans permission
3. Testez l'upload d'images (admin uniquement)

#### 3. Test Sécurité
```bash
# Test accès direct aux images
curl http://localhost:8000/media/galleries/images/image.jpg
# Devrait être protégé par serve_image view

# Test API sans token
curl http://localhost:8000/api/galleries/private-gallery/
# Devrait retourner 403/404
```

## Données de Test

Le script `run_permission_tests.py` crée automatiquement:

- **Utilisateurs**:
  - `test_admin`: Superuser (admin123)
  - `test_user1`: Membre groupe "Test Famille" (user123)
  - `test_user2`: Membre groupe "Test Amis" (user123)

- **Groupes**:
  - `Test Famille`: Avec test_user1
  - `Test Amis`: Avec test_user2

- **Galeries**:
  - `test-public`: Galerie publique
  - `test-private`: Galerie privée (groupe Famille autorisé)

## Scénarios de Test Critiques

### Scénario 1: Accès Galerie Privée
1. User1 (membre famille) → Accès galerie privée famille ✅
2. User2 (membre amis) → Pas d'accès galerie privée famille ❌
3. Admin → Accès à toutes les galeries ✅
4. Anonyme → Accès galeries publiques uniquement ✅

### Scénario 2: Gestion des Groupes
1. Admin ajoute User2 au groupe famille
2. User2 obtient l'accès à la galerie privée famille
3. Admin retire User1 du groupe famille
4. User1 perd l'accès à la galerie privée famille

### Scénario 3: Upload/Suppression Images
1. Regular user tente upload → 403 Forbidden
2. Admin upload → 201 Created
3. Regular user tente suppression → 403 Forbidden
4. Admin suppression → 204 No Content

## Métriques de Couverture

Le système de test couvre:

- ✅ **Modèles**: UserGroup, Gallery, permissions
- ✅ **Vues API**: ViewSets avec permissions
- ✅ **Permissions Custom**: CanAccessGallery, etc.
- ✅ **Cas limites**: Groupes vides, changements de visibilité
- ✅ **Authentification**: Anonyme vs authentifié vs admin

## Maintenance des Tests

### Ajout de Nouveaux Tests
1. Ajoutez les tests dans `galleries/tests.py`
2. Suivez la convention de nommage `test_*`
3. Utilisez les fixtures `setUp()` pour les données
4. Testez les cas positifs ET négatifs

### Mise à Jour des Tests
- Après modification des modèles → Mettre à jour les tests modèles
- Après modification des permissions → Mettre à jour tests API
- Après ajout d'endpoints → Ajouter tests API correspondants

## Outils et Bonnes Pratiques

### Coverage
```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report -m
coverage html  # Génère rapport HTML
```

### Factory Boy (Optionnel)
```python
# Amélioration possible avec des factories
import factory

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
```

### Mocking
```python
# Pour tester les services externes
from unittest.mock import patch, Mock

@patch('galleries.signals.create_thumbnail')
def test_image_upload_without_thumbnail_creation(self, mock_create):
    # Test upload sans génération thumbnail
    pass
```

## Résolution des Problèmes

### Erreurs Communes

1. **ImportError**: Vérifiez les imports dans `tests.py`
2. **Database errors**: Utilisez `--keepdb` pour garder la DB de test
3. **Permission errors**: Vérifiez les fixtures `setUp()`

### Debug des Tests
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Ou dans un test spécifique
def test_debug_permissions(self):
    print(f"User groups: {self.user1.user_groups.all()}")
    print(f"Gallery access: {self.private_gallery.can_access(self.user1)}")
```

Cette documentation assure une compréhension complète du système de test des permissions et facilite la maintenance future du code.