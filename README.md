# 📸 Portfolio Photographique - still24.fr

Un portfolio photographique moderne avec système d'authentification multi-niveaux, galleries publiques et privées, et notifications de sécurité en temps réel.

## ✨ Fonctionnalités

- 🖼️ **Galleries dynamiques** - Publiques et privées avec contrôle d'accès par groupe
- 🔐 **Authentification JWT** - Connexion sécurisée avec tokens
- 📱 **Responsive** - Optimisé mobile et desktop
- 🎨 **Lightbox** - Visualisation plein écran avec navigation clavier
- ⬇️ **Téléchargement** - Images individuelles ou multiples (ZIP)
- 🔔 **Notifications ntfy** - Alertes de connexion en temps réel
- 🚀 **Optimisé** - Compression GZIP, lazy loading, SEO

---

## 🏗️ Architecture

```
portfolio/
├── app/                    # Frontend Next.js 15
│   ├── components/         # Composants React (Navbar, Footer, Galleries...)
│   ├── hooks/              # Hooks (useGalleries, useBestOfImages)
│   ├── lib/                # Client API centralisé
│   ├── providers/          # AuthProvider (contexte utilisateur)
│   ├── admin/              # Panel d'administration
│   ├── gallery/[slug]/     # Pages galleries dynamiques
│   └── login/              # Page de connexion
├── backend/                # Backend Django 5
│   ├── authentication/     # JWT, utilisateurs, notifications
│   ├── galleries/          # Galleries, images, groupes
│   ├── portfolio_api/      # Configuration Django
│   └── media/              # Stockage des images
├── nginx/                  # Configuration reverse proxy
├── docker-compose.yml      # Stack Docker complète
├── DEPLOYMENT.md           # Guide de déploiement Proxmox
└── PROJECT_ROADMAP.md      # Roadmap du projet
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose (pour la production)

### Développement local

#### Backend (Django)

```bash
cd backend

# Environnement virtuel
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Dépendances
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Éditer .env avec vos valeurs

# Base de données
python manage.py migrate
python manage.py createsuperuser
python manage.py sync_galleries

# Lancer
python manage.py runserver
```

#### Frontend (Next.js)

```bash
# À la racine du projet
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 🔐 Système d'Authentification

| Type | Accès | Permissions |
|------|-------|-------------|
| **PUBLIC** | Non authentifié | Galleries publiques uniquement |
| **PRIVATE** | Utilisateur invité | Galleries publiques + privées (selon groupe) |
| **ADMIN** | Super utilisateur | Accès complet + gestion + upload |

---

## 📡 API Endpoints

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/login/` | Connexion (retourne JWT) |
| `POST` | `/api/auth/logout/` | Déconnexion |
| `POST` | `/api/auth/refresh/` | Rafraîchir le token |
| `GET` | `/api/auth/me/` | Profil utilisateur |

### Galleries
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/galleries/` | Liste des galleries accessibles |
| `GET` | `/api/galleries/{slug}/` | Détails d'une gallery |
| `GET` | `/api/galleries/{slug}/images/` | Images d'une gallery |
| `GET` | `/api/galleries/public/` | Galleries publiques par type |
| `GET` | `/api/galleries/best-of/` | Images "Best Of" |

### Images
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/images/{id}/download/` | Télécharger une image |
| `POST` | `/api/images/download-multiple/` | Télécharger en ZIP |
| `POST` | `/api/galleries/{slug}/upload/` | Upload (admin) |

### Administration
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/admin/users/` | Liste utilisateurs |
| `POST` | `/api/admin/users/invite/` | Inviter un utilisateur |
| `GET` | `/api/admin/groups/` | Liste des groupes |

---

## 🔔 Notifications ntfy

Le système envoie des notifications push pour les événements de sécurité :

| Événement | Topic | Priorité |
|-----------|-------|----------|
| Connexion réussie | `portfolio-login-success` | Normal |
| Connexion échouée | `portfolio-login-failed` | Haute |

**Configuration** (`backend/.env`) :
```env
NTFY_ENABLED=True
NTFY_SERVER_URL=https://ntfy.still24.fr
NTFY_TOPIC_SUCCESS=portfolio-login-success
NTFY_TOPIC_FAILED=portfolio-login-failed
NTFY_AUTH_TOKEN=tk_xxxxxxxx  # Optionnel
```

---

## 🐳 Déploiement Docker

### Variables d'environnement

Créer `.env` à la racine :
```env
# Django
DJANGO_SECRET_KEY=votre-clé-secrète-très-longue
BACKEND_ALLOWED_HOSTS=still24.fr,api.still24.fr
CORS_ALLOWED_ORIGINS=https://still24.fr

# Frontend
NEXT_PUBLIC_API_URL=https://still24.fr/api
NEXT_PUBLIC_MEDIA_URL=https://still24.fr/media

# ntfy
NTFY_ENABLED=True
NTFY_SERVER_URL=https://ntfy.still24.fr
NTFY_TOPIC_SUCCESS=portfolio-login-success
NTFY_TOPIC_FAILED=portfolio-login-failed
```

### Lancer la stack

```bash
# Build et démarrage
docker compose up -d --build

# Logs
docker compose logs -f

# Arrêter
docker compose down
```

### Avec Cloudflare Tunnel

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet de déploiement sur Proxmox avec Cloudflare Tunnel.

---

## 🛠️ Commandes utiles

### Backend
```bash
# Synchroniser les galleries depuis les dossiers
python manage.py sync_galleries

# Créer un superutilisateur
python manage.py createsuperuser

# Migrations
python manage.py makemigrations
python manage.py migrate
```

### Docker
```bash
# Voir les logs
docker compose logs -f backend
docker compose logs -f frontend

# Reconstruire un service
docker compose up -d --build backend

# Exécuter une commande Django
docker compose exec backend python manage.py sync_galleries
```

---

## 📚 Technologies

| Composant | Technologies |
|-----------|--------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **Backend** | Django 5.2, Django REST Framework, SimpleJWT |
| **Base de données** | SQLite |
| **Serveur** | Gunicorn, Nginx |
| **Conteneurisation** | Docker, Docker Compose |
| **Tunnel** | Cloudflare Tunnel |
| **Notifications** | ntfy (self-hosted) |

---

## 📄 License

MIT - Emilien Fourgnier
