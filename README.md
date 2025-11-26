# 📸 Portfolio Photographique - Emilien Fourgnier

Un portfolio photographique moderne avec système d'authentification multi-niveaux, galleries publiques et privées.

## 🏗️ Architecture

```
portfolio/
├── app/                    # Frontend Next.js
│   ├── components/         # Composants React réutilisables
│   ├── hooks/              # Hooks personnalisés (useGalleries, useAuth)
│   ├── lib/                # Utilitaires (api.js client centralisé)
│   ├── providers/          # Context providers (AuthProvider)
│   ├── login/              # Page de connexion
│   ├── bio/                # Page bio
│   ├── bw/                 # Galerie Noir & Blanc
│   ├── streets/            # Galerie Street Photography
│   └── explore/            # Galerie Exploration
├── backend/                # Backend Django
│   ├── authentication/     # App authentification (JWT, utilisateurs)
│   ├── galleries/          # App galleries (galeries, images)
│   ├── portfolio_api/      # Configuration Django
│   └── media/              # Stockage des images
└── public/                 # Assets statiques Next.js
```

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Python 3.10+
- pip

### Backend (Django)

```bash
# Aller dans le dossier backend
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env  # ou créer .env manuellement

# Appliquer les migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Synchroniser les galeries depuis les dossiers
python manage.py sync_galleries

# Lancer le serveur
python manage.py runserver
```

### Frontend (Next.js)

```bash
# À la racine du projet
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🔐 Système d'Authentification

| Type | Accès | Permissions |
|------|-------|-------------|
| **PUBLIC** | Non authentifié | Voir galleries publiques uniquement |
| **PRIVATE** | Authentifié (invité par admin) | Voir galleries publiques + privées selon le groupe |
| **ADMIN** | Authentifié (super utilisateur) | Accès complet + gestion utilisateurs + upload photos |

## 📡 API Endpoints

### Authentification
- `POST /api/auth/login/` - Connexion (retourne tokens JWT)
- `POST /api/auth/logout/` - Déconnexion
- `POST /api/auth/refresh/` - Rafraîchir le token
- `GET /api/auth/me/` - Profil utilisateur

### Galleries
- `GET /api/galleries/` - Liste des galleries accessibles
- `GET /api/galleries/{slug}/` - Détails d'une gallery
- `GET /api/galleries/{slug}/images/` - Images d'une gallery
- `GET /api/galleries/public/` - Galleries publiques par type

## 🛠️ Configuration

### Variables d'environnement Backend (backend/.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Variables d'environnement Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MEDIA_URL=http://localhost:8000/media
```

## 📚 Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Django 5, Django REST Framework, SimpleJWT
- **Base de données**: SQLite (dev), PostgreSQL (prod recommandé)

## 📄 License

MIT
