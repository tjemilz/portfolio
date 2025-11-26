# 📸 Portfolio Photographique - Roadmap Complète

## 🎯 Vision du Projet

Créer un site web portfolio photographique avec système d'authentification multi-niveaux permettant de gérer des galleries publiques et privées, avec upload sécurisé et téléchargement des photos.

---

## 👥 Types d'Utilisateurs

| Type | Accès | Permissions |
|------|-------|-------------|
| **PUBLIC** | Non authentifié | Voir galleries publiques uniquement |
| **PRIVATE** | Authentifié (invité par admin) | Voir galleries publiques + certaines galleries privées selon le groupe |
| **ADMIN** | Authentifié (super utilisateur) | Accès complet + gestion utilisateurs + upload photos |

---

## 🏗️ Architecture Cible

### Backend (Django)
```
backend/
├── authentication/          # Gestion utilisateurs & JWT
│   ├── models.py           # CustomUser avec groupes
│   ├── views.py            # Login, Logout, Invite
│   ├── serializers.py      # UserSerializer
│   ├── permissions.py      # IsPublic, IsPrivate, IsAdmin
│   └── urls.py
├── galleries/              # Gestion des galleries (FUSIONNÉ)
│   ├── models.py           # Gallery, Image, UserGroup
│   ├── views.py            # CRUD + Upload + Download
│   ├── serializers.py      # GallerySerializer, ImageSerializer
│   ├── permissions.py      # CanAccessGallery, CanUpload
│   └── management/
│       └── commands/
│           └── sync_galleries.py
└── media/                  # Stockage des images
    ├── galleries/
    │   ├── public/
    │   └── private/
    └── thumbnails/
```

### Frontend (Next.js)
```
frontend/
├── app/
│   ├── (public)/           # Routes publiques
│   │   ├── page.js         # Page d'accueil
│   │   ├── bio/
│   │   ├── bw/
│   │   ├── streets/
│   │   └── explore/
│   ├── (auth)/             # Routes d'authentification
│   │   └── login/
│   ├── (private)/          # Routes privées
│   │   ├── layout.js       # Middleware auth
│   │   ├── dashboard/
│   │   └── private-galleries/
│   └── (admin)/            # Routes admin
│       ├── layout.js       # Middleware admin
│       ├── dashboard/
│       ├── users/
│       └── upload/
├── components/
│   ├── auth/
│   ├── galleries/
│   └── upload/
├── lib/
│   ├── api.js              # Client API centralisé
│   └── auth.js
└── middleware.js           # Protection routes
```

---

## 📋 PHASE 1 : Restructuration & Sécurisation (3-4 jours)

### ✅ Étape 1.1 : Configuration de l'Environnement

**Objectif**: Créer les fichiers de configuration et variables d'environnement

**Backend**:
- [ ] Créer `backend/.env`
  ```bash
  DEBUG=True
  SECRET_KEY=your-django-secret-key-here
  DATABASE_URL=sqlite:///db.sqlite3
  ALLOWED_HOSTS=localhost,127.0.0.1
  CORS_ALLOWED_ORIGINS=http://localhost:3000
  MEDIA_ROOT=/home/emilien/Documents/Perso/portfolio/backend/media
  MEDIA_URL=/media/
  JWT_ACCESS_TOKEN_LIFETIME=60
  JWT_REFRESH_TOKEN_LIFETIME=1440
  ```
- [ ] Installer `python-decouple` : `pip install python-decouple`
- [ ] Modifier `backend/portfolio_api/settings.py` pour utiliser les variables d'env
- [ ] Ajouter `.env` au `.gitignore`

**Frontend**:
- [ ] Créer `frontend/.env.local`
  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_MEDIA_URL=http://localhost:8000/media
  ```
- [ ] Ajouter `.env.local` au `.gitignore`

**Commandes**:
```bash
# Backend
cd backend
pip install python-decouple django-cors-headers pillow
python manage.py migrate

# Frontend
cd frontend
npm install
```

**Validation**: 
- Les deux serveurs démarrent sans erreur
- Les variables d'environnement sont chargées

---

### ✅ Étape 1.2 : Fusion des Apps Backend

**Objectif**: Simplifier l'architecture en fusionnant `images`, `PrivateGallery` et `galleries` en une seule app `galleries`

**Actions**:
- [ ] Créer une nouvelle app propre : `python manage.py startapp galleries_new`
- [ ] Créer `backend/galleries_new/models.py` avec les modèles consolidés :
  ```python
  # UserGroup, Gallery, Image
  ```
- [ ] Migrer les données existantes
- [ ] Supprimer les anciennes apps
- [ ] Renommer `galleries_new` en `galleries`
- [ ] Mettre à jour `INSTALLED_APPS` dans `settings.py`

**Fichiers à créer**:
- `backend/galleries/models.py` (nouveau modèle unifié)
- `backend/galleries/admin.py` (interface admin)
- `backend/galleries/migrations/0001_initial.py`

**Commandes**:
```bash
cd backend
python manage.py makemigrations galleries
python manage.py migrate galleries
```

**Validation**: 
- La base de données contient les nouvelles tables
- L'admin Django affiche les modèles correctement

---

### ✅ Étape 1.3 : Migration des Images

**Objectif**: Déplacer toutes les images de `frontend/public/` vers `backend/media/`

**Actions**:
- [ ] Créer la structure de dossiers :
  ```bash
  mkdir -p backend/media/galleries/public/{bestof,bw,streets,explore}
  mkdir -p backend/media/galleries/private
  mkdir -p backend/media/thumbnails
  ```
- [ ] Déplacer les images :
  ```bash
  mv frontend/public/bestof/* backend/media/galleries/public/bestof/
  mv frontend/public/bw/* backend/media/galleries/public/bw/
  mv frontend/public/streets/* backend/media/galleries/public/streets/
  mv frontend/public/explore/* backend/media/galleries/public/explore/
  ```
- [ ] Créer un script de synchronisation DB
- [ ] Supprimer les dossiers vides dans `frontend/public/`

**Fichier à créer**:
- `backend/galleries/management/commands/sync_galleries.py`

**Commandes**:
```bash
cd backend
python manage.py sync_galleries
```

**Validation**: 
- Toutes les images sont dans `backend/media/`
- La base de données contient les métadonnées des images
- Les images sont accessibles via l'API Django

---

### ✅ Étape 1.4 : Système de Permissions

**Objectif**: Implémenter le système de permissions à 3 niveaux

**Actions**:
- [ ] Créer `backend/authentication/permissions.py`
  - `IsPublicUser`, `IsPrivateUser`, `IsAdminUser`
- [ ] Créer `backend/galleries/permissions.py`
  - `CanAccessGallery`, `CanUploadImage`, `CanDeleteImage`
- [ ] Étendre le modèle User avec des groupes personnalisés
- [ ] Créer les groupes par défaut dans une migration

**Fichiers à créer/modifier**:
- `backend/authentication/models.py` (CustomUser avec groupes)
- `backend/authentication/permissions.py`
- `backend/galleries/permissions.py`

**Commandes**:
```bash
cd backend
python manage.py makemigrations authentication
python manage.py migrate authentication
python manage.py create_default_groups
```

**Validation**: 
- Les 3 types de groupes existent (PUBLIC, PRIVATE, ADMIN)
- Les permissions sont testables via l'API
- Un utilisateur non authentifié ne peut pas accéder aux galleries privées

---

## 📋 PHASE 2 : Authentification & Sécurité (3-4 jours)

### ✅ Étape 2.1 : Backend - Authentification JWT Complète

**Objectif**: Finaliser le système d'authentification JWT avec refresh tokens

**Actions**:
- [ ] Configurer JWT dans `settings.py`
- [ ] Créer les endpoints d'authentification :
  - `POST /api/auth/login/`
  - `POST /api/auth/logout/`
  - `POST /api/auth/refresh/`
  - `GET /api/auth/me/`
- [ ] Implémenter la blacklist des tokens révoqués
- [ ] Créer les serializers personnalisés

**Fichiers à créer/modifier**:
- `backend/authentication/views.py`
- `backend/authentication/serializers.py`
- `backend/authentication/urls.py`

**Validation**: 
- Login fonctionne et retourne access + refresh tokens
- Logout révoque correctement les tokens
- Le refresh token permet d'obtenir un nouveau access token

---

### ✅ Étape 2.2 : Frontend - Context d'Authentification

**Objectif**: Créer un système global de gestion de l'authentification

**Actions**:
- [ ] Créer `frontend/app/providers/AuthProvider.js`
- [ ] Implémenter les fonctions :
  - `login(email, password)`
  - `logout()`
  - `refreshToken()`
  - `checkAuth()`
- [ ] Wrapper l'app avec `<AuthProvider>`
- [ ] Créer le hook `useAuth()`

**Fichiers à créer**:
- `frontend/app/providers/AuthProvider.js`
- `frontend/hooks/useAuth.js`
- Modifier `frontend/app/layout.js`

**Validation**: 
- Le state d'authentification est accessible partout
- Le refresh automatique des tokens fonctionne
- La déconnexion nettoie correctement le state

---

### ✅ Étape 2.3 : Frontend - Pages de Login

**Objectif**: Créer l'interface de connexion

**Actions**:
- [ ] Créer la page `frontend/app/(auth)/login/page.js`
- [ ] Créer le formulaire de login avec validation
- [ ] Gérer les erreurs de connexion
- [ ] Rediriger après connexion selon le rôle utilisateur

**Fichiers à créer**:
- `frontend/app/(auth)/login/page.js`
- `frontend/components/auth/LoginForm.jsx`

**Validation**: 
- Le formulaire valide les champs avant envoi
- Les erreurs s'affichent clairement
- La redirection fonctionne selon le rôle

---

### ✅ Étape 2.4 : Frontend - Protection des Routes

**Objectif**: Empêcher l'accès aux routes privées sans authentification

**Actions**:
- [ ] Créer `frontend/middleware.js`
- [ ] Protéger les routes `/private-galleries/*` et `/admin-dashboard/*`
- [ ] Créer les layouts avec vérification d'auth :
  - `frontend/app/(private)/layout.js`
  - `frontend/app/(admin)/layout.js`

**Fichiers à créer**:
- `frontend/middleware.js`
- `frontend/app/(private)/layout.js`
- `frontend/app/(admin)/layout.js`

**Validation**: 
- Un utilisateur non connecté est redirigé vers `/login`
- Un utilisateur PRIVATE ne peut pas accéder aux routes admin
- Les routes publiques restent accessibles

---

## 📋 PHASE 3 : Galleries & Images (4-5 jours)

### ✅ Étape 3.1 : Backend - API des Galleries

**Objectif**: Créer l'API CRUD pour les galleries

**Actions**:
- [ ] Créer les ViewSets :
  - `GalleryViewSet` (list, retrieve, create, update, delete)
  - `ImageViewSet` (list, retrieve, create, delete)
- [ ] Implémenter les filtres par visibilité
- [ ] Ajouter la pagination
- [ ] Créer les serializers

**Fichiers à créer**:
- `backend/galleries/views.py`
- `backend/galleries/serializers.py`
- `backend/galleries/urls.py`

**Endpoints**:
```
GET    /api/galleries/              # Liste des galleries accessibles
GET    /api/galleries/{slug}/       # Détails d'une gallery
POST   /api/galleries/              # Créer une gallery (admin)
PUT    /api/galleries/{slug}/       # Modifier une gallery (admin)
DELETE /api/galleries/{slug}/       # Supprimer une gallery (admin)
GET    /api/galleries/{slug}/images/ # Liste des images d'une gallery
```

**Validation**: 
- Les galleries sont filtrées selon les permissions
- La pagination fonctionne
- Les endpoints CRUD sont sécurisés

---

### ✅ Étape 3.2 : Backend - Servir les Images Sécurisées

**Objectif**: Servir les images via Django en vérifiant les permissions

**Actions**:
- [ ] Créer la vue `serve_image(request, gallery_slug, filename)`
- [ ] Vérifier les permissions avant de servir le fichier
- [ ] Gérer les images manquantes (404)
- [ ] Ajouter les headers de cache appropriés

**Fichier à créer**:
- Ajouter dans `backend/galleries/views.py`

**Endpoint**:
```
GET /api/galleries/{slug}/images/{filename}/
```

**Validation**: 
- Une image privée n'est pas accessible sans auth
- Les images publiques sont servies correctement
- Les erreurs 404 sont gérées

---

### ✅ Étape 3.3 : Frontend - Client API Centralisé

**Objectif**: Créer un client API réutilisable pour toutes les requêtes

**Actions**:
- [ ] Créer `frontend/lib/api.js`
- [ ] Implémenter les fonctions :
  - `fetchGalleries(type)`
  - `fetchGallery(slug)`
  - `fetchImages(gallerySlug)`
  - `uploadImage(gallerySlug, file)`
  - `deleteImage(id)`
- [ ] Gérer les tokens JWT automatiquement
- [ ] Gérer les erreurs globalement

**Fichier à créer**:
- `frontend/lib/api.js`

**Validation**: 
- Les tokens sont automatiquement ajoutés aux requêtes
- Les erreurs 401 déconnectent l'utilisateur
- Les erreurs sont loggées correctement

---

### ✅ Étape 3.4 : Frontend - Affichage des Galleries

**Objectif**: Créer l'interface d'affichage des galleries

**Actions**:
- [ ] Créer le composant `GalleryGrid.jsx`
- [ ] Créer le composant `ImageCard.jsx`
- [ ] Implémenter le lazy loading des images
- [ ] Ajouter un skeleton loading
- [ ] Créer la page de détail d'une gallery

**Fichiers à créer**:
- `frontend/components/galleries/GalleryGrid.jsx`
- `frontend/components/galleries/ImageCard.jsx`
- `frontend/components/galleries/GalleryGridSkeleton.jsx`
- `frontend/app/(public)/gallery/[slug]/page.js`

**Validation**: 
- Les galleries s'affichent correctement
- Le lazy loading fonctionne
- Le skeleton s'affiche pendant le chargement

---

### ✅ Étape 3.5 : Frontend - Lightbox

**Objectif**: Créer un lightbox pour afficher les images en plein écran

**Actions**:
- [ ] Créer le composant `Lightbox.jsx`
- [ ] Gérer la navigation clavier (flèches, Escape)
- [ ] Ajouter un bouton de téléchargement
- [ ] Gérer le swipe tactile
- [ ] Précharger les images suivantes/précédentes

**Fichier à créer**:
- `frontend/components/galleries/Lightbox.jsx`

**Validation**: 
- Le lightbox s'ouvre au clic sur une image
- La navigation fonctionne (clavier + swipe)
- Les images sont préchargées

---

## 📋 PHASE 4 : Upload & Gestion Admin (4-5 jours)

### ✅ Étape 4.1 : Backend - Upload d'Images

**Objectif**: Créer l'endpoint sécurisé d'upload d'images

**Actions**:
- [ ] Créer la vue `upload_images(request, gallery_slug)`
- [ ] Valider le format (JPEG/JPG uniquement)
- [ ] Valider la taille maximum (ex: 10MB)
- [ ] Générer automatiquement les thumbnails
- [ ] Extraire les métadonnées EXIF
- [ ] Créer les objets Image en DB

**Fichier à modifier**:
- `backend/galleries/views.py`

**Endpoint**:
```
POST /api/galleries/{slug}/upload/
Content-Type: multipart/form-data
```

**Validation**: 
- Seuls les JPEG/JPG sont acceptés
- Les fichiers trop gros sont rejetés
- Les thumbnails sont générés automatiquement
- Seuls les admins peuvent upload

---

### ✅ Étape 4.2 : Frontend - Interface d'Upload

**Objectif**: Créer l'interface drag & drop pour uploader des images

**Actions**:
- [ ] Créer le composant `ImageUploader.jsx`
- [ ] Implémenter le drag & drop
- [ ] Ajouter une preview avant upload
- [ ] Afficher une barre de progression
- [ ] Gérer les uploads multiples simultanés
- [ ] Afficher les erreurs d'upload

**Fichiers à créer**:
- `frontend/components/upload/ImageUploader.jsx`
- `frontend/components/upload/UploadProgress.jsx`
- `frontend/app/(admin)/upload/page.js`

**Validation**: 
- Le drag & drop fonctionne
- Les previews s'affichent
- La progression est visible
- Les erreurs sont claires

---

### ✅ Étape 4.3 : Backend - Gestion des Utilisateurs

**Objectif**: Créer l'API pour gérer les utilisateurs (admin uniquement)

**Actions**:
- [ ] Créer les endpoints :
  - `GET /api/users/` (liste)
  - `POST /api/users/invite/` (inviter)
  - `PUT /api/users/{id}/` (modifier)
  - `DELETE /api/users/{id}/` (supprimer)
- [ ] Implémenter l'invitation par email
- [ ] Créer les serializers

**Fichiers à créer/modifier**:
- `backend/authentication/views.py`
- `backend/authentication/serializers.py`

**Validation**: 
- Seuls les admins peuvent gérer les utilisateurs
- L'invitation envoie un email
- Les groupes sont assignables

---

### ✅ Étape 4.4 : Frontend - Dashboard Admin

**Objectif**: Créer l'interface de gestion admin

**Actions**:
- [ ] Créer la page `frontend/app/(admin)/dashboard/page.js`
- [ ] Créer le composant `UserManagement.jsx`
- [ ] Créer le composant `GalleryManagement.jsx`
- [ ] Afficher des statistiques (nombre d'images, utilisateurs, etc.)

**Fichiers à créer**:
- `frontend/app/(admin)/dashboard/page.js`
- `frontend/components/admin/UserManagement.jsx`
- `frontend/components/admin/GalleryManagement.jsx`
- `frontend/components/admin/Stats.jsx`

**Validation**: 
- Les statistiques s'affichent
- Les utilisateurs sont listés et modifiables
- Les galleries sont listées et modifiables

---

## 📋 PHASE 5 : Téléchargement & Optimisations (2-3 jours)

### ✅ Étape 5.1 : Backend - Téléchargement d'Images

**Objectif**: Permettre le téléchargement sécurisé des images

**Actions**:
- [ ] Créer l'endpoint `download_image(request, image_id)`
- [ ] Générer des liens temporaires (optionnel)
- [ ] Créer un endpoint pour télécharger plusieurs images (ZIP)
- [ ] Logger les téléchargements

**Endpoints**:
```
GET /api/images/{id}/download/
POST /api/images/download-multiple/  # Retourne un ZIP
```

**Validation**: 
- Les images se téléchargent avec le bon nom
- Le ZIP contient toutes les images sélectionnées
- Les permissions sont vérifiées

---

### ✅ Étape 5.2 : Frontend - Boutons de Téléchargement

**Objectif**: Ajouter des boutons de téléchargement partout

**Actions**:
- [ ] Ajouter un bouton dans le Lightbox
- [ ] Ajouter un bouton sur chaque ImageCard
- [ ] Implémenter la sélection multiple
- [ ] Créer un bouton "Télécharger la sélection"

**Fichiers à modifier**:
- `frontend/components/galleries/Lightbox.jsx`
- `frontend/components/galleries/ImageCard.jsx`
- `frontend/components/galleries/GalleryGrid.jsx`

**Validation**: 
- Le téléchargement unitaire fonctionne
- Le téléchargement multiple crée un ZIP
- La sélection multiple est intuitive

---

### ✅ Étape 5.3 : Optimisations Performances

**Objectif**: Optimiser le chargement et les performances

**Actions**:
- [ ] Implémenter le cache Redis (backend)
- [ ] Optimiser les requêtes DB (select_related, prefetch_related)
- [ ] Ajouter la compression GZIP
- [ ] Optimiser les images Next.js (Image component)
- [ ] Implémenter le code splitting par route
- [ ] Ajouter des meta tags pour le SEO

**Fichiers à modifier**:
- `backend/portfolio_api/settings.py` (cache)
- `backend/galleries/views.py` (optimisation queries)
- Tous les composants frontend utilisant des images

**Validation**: 
- Les pages se chargent plus rapidement
- Le cache fonctionne correctement
- Les images sont optimisées automatiquement

---

### ✅ Étape 5.4 : Tests & Documentation

**Objectif**: Tester et documenter le projet

**Actions**:
- [ ] Écrire des tests unitaires backend (pytest)
- [ ] Écrire des tests frontend (Jest/React Testing Library)
- [ ] Créer la documentation utilisateur (README)
- [ ] Créer la documentation technique (API docs)
- [ ] Tester sur différents navigateurs
- [ ] Tester sur mobile

**Fichiers à créer**:
- `backend/galleries/tests.py`
- `frontend/__tests__/`
- `README.md` (utilisateur)
- `TECHNICAL_DOCS.md` (développeur)

**Validation**: 
- Les tests passent tous
- La documentation est claire
- Le site fonctionne sur tous les navigateurs

---

## 📊 Estimation Totale

| Phase | Durée | Description |
|-------|-------|-------------|
| Phase 1 | 3-4 jours | Restructuration & Sécurisation |
| Phase 2 | 3-4 jours | Authentification & Sécurité |
| Phase 3 | 4-5 jours | Galleries & Images |
| Phase 4 | 4-5 jours | Upload & Gestion Admin |
| Phase 5 | 2-3 jours | Téléchargement & Optimisations |
| **Total** | **16-21 jours** | ~3-4 semaines |

---

## 🚀 Par Où Commencer ?

Je vous propose de commencer par **l'Étape 1.1 : Configuration de l'Environnement**.

Voulez-vous que je génère les fichiers de configuration (`.env` et modifications de `settings.py`) ?