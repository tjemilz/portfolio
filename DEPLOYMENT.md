# 🚀 Guide de Déploiement sur Proxmox

## 📋 Prérequis

- Proxmox VE installé et configuré
- Accès SSH à votre serveur Proxmox
- Cloudflare Tunnel configuré (pour exposer le site sans ouvrir de ports)
- Domaine : `still24.fr`

---

## 🌐 Architecture avec Cloudflare Tunnel

```
Internet → Cloudflare → Tunnel → Container LXC → Docker (nginx/frontend/backend)
                                      ↓
                              ntfy.still24.fr (notifications)
```

**Avantages du Cloudflare Tunnel :**
- ✅ Pas besoin d'ouvrir de ports sur le routeur
- ✅ Protection DDoS gratuite
- ✅ SSL/HTTPS automatique
- ✅ IP publique du visiteur via header `CF-Connecting-IP`
- ✅ Pays du visiteur via header `CF-IPCountry`

---

## 🏗️ Étape 1 : Créer un Container LXC

### Via l'interface Proxmox :

1. **Créer le container** :
   - Cliquer sur "Create CT"
   - **Template** : Debian 12 ou Ubuntu 22.04
   - **Hostname** : `portfolio`
   - **Resources** :
     - CPU : 2 cores minimum
     - RAM : 2 GB minimum
     - Disk : 20 GB minimum
   - **Network** : Bridge (vmbr0), DHCP ou IP statique

2. **Démarrer le container** et se connecter en SSH

### Ou via CLI :
```bash
# Sur le serveur Proxmox
pct create 100 local:vztmpl/debian-12-standard_12.0-1_amd64.tar.zst \
  --hostname portfolio \
  --cores 2 \
  --memory 2048 \
  --swap 512 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1

pct start 100
pct enter 100
```

---

## 🐳 Étape 2 : Installer Docker dans le Container

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer les dépendances
apt install -y ca-certificates curl gnupg lsb-release git

# Ajouter la clé GPG Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter le repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Vérifier l'installation
docker --version
docker compose version
```

---

## 📂 Étape 3 : Déployer l'Application

### Cloner le repository :
```bash
cd /opt
git clone https://github.com/tjemilz/portfolio.git
cd portfolio
```

### Configurer les variables d'environnement :
```bash
# Copier les fichiers d'exemple
cp .env.docker.example .env
cp backend/.env.example backend/.env

# Générer une clé secrète Django sécurisée
SECRET_KEY=$(openssl rand -base64 50 | tr -dc 'a-zA-Z0-9' | head -c 50)
echo "Generated SECRET_KEY: $SECRET_KEY"

# Éditer les fichiers .env
nano .env
nano backend/.env
```

### Configuration `.env` (racine du projet) :
```env
DJANGO_SECRET_KEY=votre-cle-secrete-generee
BACKEND_ALLOWED_HOSTS=localhost,still24.fr
CORS_ALLOWED_ORIGINS=https://still24.fr,https://www.still24.fr
# Use relative URLs for API calls (Nginx will route /api/ to backend)
# This avoids CORS issues since the frontend domain == API domain
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MEDIA_URL=/media
```

### Configuration `backend/.env` :
```env
DEBUG=False
SECRET_KEY=votre-cle-secrete-generee
ALLOWED_HOSTS=localhost,still24.fr
CORS_ALLOWED_ORIGINS=https://still24.fr,https://www.still24.fr
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=360
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# Ntfy Notifications
NTFY_ENABLED=True
NTFY_SERVER_URL=https://ntfy.still24.fr
NTFY_TOPIC_SUCCESS=portfolio-login-success
NTFY_TOPIC_FAILED=portfolio-login-failed
NTFY_AUTH_TOKEN=
```

---

## 📱 Étape 3.5 : Configurer les Notifications Ntfy (Optionnel)

Le système envoie automatiquement des notifications via **ntfy** à chaque connexion (réussie ou échouée) avec les informations suivantes :
- 👤 Username et email
- 🌐 Adresse IP publique
- 🖥️ Navigateur et système d'exploitation
- 🕐 Date et heure
- 🎭 Rôle de l'utilisateur

### Configuration :

1. **Ton serveur ntfy est déjà configuré** sur `ntfy.still24.fr`

2. **Créer 2 topics** sur ton instance :
   - `portfolio-login-success` → Connexions réussies ✅
   - `portfolio-login-failed` → Tentatives échouées ⚠️

3. **Installer l'app ntfy sur ton téléphone** :
   - [Android (Play Store)](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
   - [iOS (App Store)](https://apps.apple.com/app/ntfy/id1625396347)

4. **S'abonner aux topics** :
   - Ouvrir l'app ntfy
   - Ajouter un serveur : `https://ntfy.still24.fr`
   - S'abonner aux 2 topics :
     - `portfolio-login-success` (notifications normales)
     - `portfolio-login-failed` (notifications prioritaires)

5. **Variables d'environnement** :
```env
NTFY_ENABLED=True
NTFY_SERVER_URL=https://ntfy.paulatreides.fr
NTFY_TOPIC_SUCCESS=portfolio-login-success
NTFY_TOPIC_FAILED=portfolio-login-failed
# Si tu as configuré l'auth sur ton serveur ntfy :
# NTFY_AUTH_TOKEN=ton_token
```

### Avantage des 2 topics :
- Tu peux configurer des **sonneries différentes** pour chaque topic
- Désactiver les notifications de succès la nuit, mais garder les échecs
- Filtrer plus facilement dans l'historique

### Exemple de notification reçue :
```
🔐 Connexion: admin

✅ Connexion réussie

👤 Utilisateur: admin
📧 Email: admin@example.com
🎭 Rôle: ADMIN
👑 Admin

🌐 IP: 203.0.113.42
🌍 Pays: FR
🖥️ Chrome sur Windows (Desktop)
🕐 27/11/2025 14:32:15
```

> 💡 **Note Cloudflare** : L'IP et le pays sont automatiquement récupérés via les headers Cloudflare (`CF-Connecting-IP` et `CF-IPCountry`).

---

## 🏃 Étape 4 : Lancer les Containers

```bash
# Build et démarrage
docker compose up -d --build

# Vérifier les logs
docker compose logs -f

# Vérifier que tout fonctionne
docker compose ps
```

### Initialiser la base de données :
```bash
# Appliquer les migrations
docker compose exec backend python manage.py migrate

# Créer un superuser
docker compose exec backend python manage.py createsuperuser

# Synchroniser les galeries existantes (si besoin)
docker compose exec backend python manage.py sync_galleries
```

---

## 🌐 Étape 5 : Configurer Cloudflare Tunnel

### Installer cloudflared dans le container :
```bash
# Télécharger cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Authentifier (ouvre un lien dans le navigateur)
cloudflared tunnel login

# Créer le tunnel
cloudflared tunnel create portfolio

# Configurer le tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: portfolio
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Frontend principal
  - hostname: still24.fr
    service: http://localhost:80
  - hostname: www.still24.fr
    service: http://localhost:80
  
  # API Backend
  - hostname: api.still24.fr
    service: http://localhost:80
  
  # Catch-all
  - service: http_status:404
EOF

# Configurer le DNS (ajoute les CNAME automatiquement)
cloudflared tunnel route dns portfolio still24.fr
cloudflared tunnel route dns portfolio www.still24.fr
cloudflared tunnel route dns portfolio api.still24.fr

# Lancer le tunnel en service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared

# Vérifier le statut
systemctl status cloudflared
```

### Avantages de Cloudflare Tunnel :
- ✅ **Pas de ports ouverts** sur ton réseau
- ✅ **SSL automatique** géré par Cloudflare
- ✅ **Protection DDoS** incluse
- ✅ **IP réelle** via header `CF-Connecting-IP`
- ✅ **Pays du visiteur** via header `CF-IPCountry`

> ⚠️ **Important** : Avec Cloudflare Tunnel, tu n'as PAS besoin de Certbot/Let's Encrypt. Cloudflare gère le SSL.

---

## 🔄 Étape 6 : Commandes Utiles

```bash
# Voir les logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Redémarrer un service
docker compose restart backend

# Arrêter tous les services
docker compose down

# Mise à jour du code
git pull
docker compose up -d --build

# Backup de la base de données
docker compose exec backend python manage.py dumpdata > backup.json

# Backup des médias
tar -czvf media_backup.tar.gz backend/media/
```

---

## 👤 Gestion des Utilisateurs

### Créer un nouveau superutilisateur :
```bash
docker compose exec backend python manage.py createsuperuser
```

### Changer le mot de passe d'un utilisateur :
```bash
docker compose exec backend python manage.py changepassword <username>
```

### Modifier un utilisateur existant (username, email, mot de passe) :
```bash
docker compose exec backend python manage.py shell
```

Puis dans le shell Python :
```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Récupérer l'utilisateur
user = User.objects.get(username='ancien_username')

# Modifier les informations
user.username = 'nouveau_username'
user.email = 'nouveau@email.com'
user.set_password('NouveauMotDePasse123!')
user.save()

exit()
```

### Supprimer un utilisateur :
```bash
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.get(username='username_a_supprimer').delete()
"
```

### Lister tous les utilisateurs :
```bash
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
for u in User.objects.all():
    print(f'{u.username} - {u.email} - Admin: {u.is_superuser}')
"
```

---

## 🔒 Sécurité Additionnelle

### Firewall (UFW) :
```bash
apt install ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Fail2ban (protection brute force) :
```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### Mises à jour automatiques :
```bash
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

---

## 📊 Monitoring

### Logs en temps réel :
```bash
docker compose logs -f --tail=100
```

### Statistiques des containers :
```bash
docker stats
```

### Vérifier l'état de santé :
```bash
curl http://localhost/api/galleries/public/
curl http://localhost/
```

---

## 🆘 Dépannage

### Le backend ne démarre pas :
```bash
# Vérifier les logs
docker compose logs backend

# Vérifier les migrations
docker compose exec backend python manage.py migrate --check
```

### Problèmes de permissions sur les médias :
```bash
# Fixer les permissions
chown -R 1000:1000 backend/media
chmod -R 755 backend/media
```

### Nginx 502 Bad Gateway :
```bash
# Vérifier que les services sont up
docker compose ps

# Redémarrer les services
docker compose restart
```

---

## ✅ Checklist de Production

- [ ] SECRET_KEY changé et sécurisé
- [ ] DEBUG=False
- [ ] ALLOWED_HOSTS configuré
- [ ] CORS configuré correctement
- [ ] SSL/HTTPS activé
- [ ] Firewall configuré
- [ ] Backups automatisés
- [ ] Monitoring en place
- [ ] Fail2ban configuré
