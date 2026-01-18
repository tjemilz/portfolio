# 🐳 Guide de Déploiement Docker - Portfolio avec Demandes d'Impression

## ✅ Vérifications Pré-Déploiement

### 1. Migrations de Base de Données

Les migrations pour le système de demandes d'impression sont incluses :
- `0003_printrequest_printrequestitem.py` - Crée les tables PrintRequest et PrintRequestItem

Le script `entrypoint.sh` exécute automatiquement les migrations au démarrage du conteneur backend.

### 2. Variables d'Environnement

Créez un fichier `.env` à la racine du projet basé sur `.env.example` :

```bash
cp .env.example .env
```

**Variables critiques à configurer :**

```env
# Django - IMPORTANT : Générer une nouvelle clé secrète !
DJANGO_SECRET_KEY=votre-cle-secrete-super-longue-et-aleatoire

# Domaines autorisés
BACKEND_ALLOWED_HOSTS=votre-domaine.com,api.votre-domaine.com
CORS_ALLOWED_ORIGINS=https://votre-domaine.com

# URLs publiques
NEXT_PUBLIC_API_URL=https://votre-domaine.com
NEXT_PUBLIC_MEDIA_URL=https://votre-domaine.com/media
```

### 3. Persistence des Données

**Volumes Docker configurés :**

- `./backend/media:/app/media` - Fichiers uploadés (images, galeries)
- `./backend/db.sqlite3:/app/db.sqlite3` - Base de données SQLite
- `backend_static:/app/staticfiles` - Fichiers statiques Django
- `./logs/backend:/app/logs` - Logs backend
- `./logs/nginx:/var/log/nginx` - Logs Nginx

**⚠️ IMPORTANT pour la production :**
Assurez-vous de sauvegarder régulièrement :
- `/backend/db.sqlite3` - Contient toutes les demandes d'impression
- `/backend/media/` - Contient les images uploadées

### 4. Permissions et Sécurité

Le Dockerfile backend :
- ✅ Crée un utilisateur non-root `appuser`
- ✅ Définit les permissions correctes sur `/app/media` et `/app/logs`
- ✅ Lance l'application avec l'utilisateur non-root

**Routes protégées (authentication requise) :**
- `POST /api/galleries/print-requests/` - Créer une demande
- `GET /api/galleries/print-requests/` - Liste des demandes
- `PATCH /api/galleries/print-requests/{id}/` - Modifier (admin)
- `DELETE /api/galleries/print-requests/{id}/` - Supprimer

### 5. Configuration Nginx

Le fichier `nginx.conf` est configuré pour :
- ✅ Proxy l'API backend sur `/api/*`
- ✅ Servir les fichiers média sur `/media/*`
- ✅ Servir les fichiers statiques sur `/static/*`
- ✅ Rate limiting sur les endpoints sensibles
- ✅ Taille max d'upload : 25MB

## 🚀 Déploiement

### Première Installation

```bash
# 1. Cloner le repository
git clone <votre-repo>
cd portfolio

# 2. Créer et configurer le fichier .env
cp .env.example .env
nano .env  # Configurer les variables

# 3. Créer les répertoires de logs
mkdir -p logs/backend logs/nginx

# 4. Build et démarrer les conteneurs
docker-compose up -d --build

# 5. Vérifier les logs
docker-compose logs -f backend

# 6. Créer un superutilisateur (si nécessaire)
docker-compose exec backend python manage.py createsuperuser
```

### Mise à Jour

```bash
# 1. Arrêter les conteneurs
docker-compose down

# 2. Pull les dernières modifications
git pull origin main

# 3. Rebuild et redémarrer
docker-compose up -d --build

# 4. Les migrations s'exécutent automatiquement via entrypoint.sh
docker-compose logs backend | grep "Running database migrations"
```

### Vérifications Post-Déploiement

```bash
# Vérifier que tous les conteneurs sont running
docker-compose ps

# Vérifier les migrations
docker-compose exec backend python manage.py showmigrations galleries

# Tester l'API
curl https://votre-domaine.com/api/galleries/public/

# Vérifier les logs d'erreur
docker-compose logs backend | grep ERROR
docker-compose logs nginx | grep ERROR
```

## 🔍 Tests Fonctionnels

### 1. Test Authentification

```bash
# Login
curl -X POST https://votre-domaine.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 2. Test Demande d'Impression

```bash
# Avec token d'authentification
curl -X POST https://votre-domaine.com/api/galleries/print-requests/ \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "image": 1,
        "print_size": "10x15",
        "quantity": 2,
        "custom_size": ""
      }
    ],
    "notes": "Test depuis production"
  }'
```

### 3. Test Admin Panel

1. Ouvrir https://votre-domaine.com/admin
2. Se connecter avec compte admin
3. Aller dans "Impressions"
4. Vérifier que les demandes s'affichent

## 🛠️ Dépannage

### Problème : Migrations non appliquées

```bash
# Forcer l'exécution des migrations
docker-compose exec backend python manage.py migrate --noinput

# Vérifier l'état
docker-compose exec backend python manage.py showmigrations
```

### Problème : Permissions sur les fichiers média

```bash
# Corriger les permissions
docker-compose exec backend chown -R appuser:appuser /app/media
docker-compose exec backend chmod -R 755 /app/media
```

### Problème : Base de données corrompue

```bash
# Backup d'abord !
cp backend/db.sqlite3 backend/db.sqlite3.backup

# Vérifier l'intégrité
docker-compose exec backend python manage.py check
```

### Problème : 401 Unauthorized sur les demandes

Vérifier :
1. Token JWT valide et non expiré
2. Header Authorization bien formaté : `Bearer <token>`
3. CORS configuré correctement dans `.env`

## 📊 Monitoring

### Logs en temps réel

```bash
# Backend
docker-compose logs -f backend

# Nginx
docker-compose logs -f nginx

# Tous les services
docker-compose logs -f
```

### Vérifier les demandes d'impression

```bash
# Via Django shell
docker-compose exec backend python manage.py shell
>>> from galleries.models import PrintRequest
>>> PrintRequest.objects.all().count()
>>> PrintRequest.objects.filter(status='PENDING').count()
```

## 🔐 Sécurité Production

### Checklist Sécurité

- [ ] `DEBUG=False` dans `.env`
- [ ] `DJANGO_SECRET_KEY` unique et complexe
- [ ] `ALLOWED_HOSTS` configuré correctement
- [ ] HTTPS activé (via Cloudflare ou Certbot)
- [ ] Sauvegardes automatiques configurées
- [ ] Rate limiting activé dans Nginx
- [ ] Utilisateur non-root dans les conteneurs
- [ ] Logs monitored (idéalement avec Wazuh)

### Backup Automatique

Créer un cron job pour sauvegarder la base de données :

```bash
# Ajouter dans crontab
0 2 * * * docker-compose exec -T backend python manage.py dumpdata > /backups/db_$(date +\%Y\%m\%d).json
0 3 * * * tar -czf /backups/media_$(date +\%Y\%m\%d).tar.gz backend/media/
```

## 🎉 Conclusion

Votre système de demandes d'impression est prêt pour la production avec Docker ! Les migrations s'appliquent automatiquement, les données sont persistées dans des volumes, et toutes les routes sont sécurisées avec JWT.

**Support :**
- Logs : `docker-compose logs`
- Shell Django : `docker-compose exec backend python manage.py shell`
- Base de données : `backend/db.sqlite3` (sauvegardé dans le volume)
