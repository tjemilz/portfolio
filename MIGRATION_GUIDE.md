# 🔄 Guide de Mise à Jour - Ajout du Système de Demandes d'Impression

## ⚠️ Pré-requis : Sauvegarde OBLIGATOIRE

**Avant toute manipulation, effectuer une sauvegarde complète :**

```bash
# 1. Créer un répertoire de backup avec timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 2. Sauvegarder la base de données
docker-compose exec -T backend python manage.py dumpdata > $BACKUP_DIR/db_backup.json
# OU copier directement le fichier SQLite
cp backend/db.sqlite3 $BACKUP_DIR/db.sqlite3.backup

# 3. Sauvegarder les fichiers média
tar -czf $BACKUP_DIR/media_backup.tar.gz backend/media/

# 4. Sauvegarder la configuration
cp .env $BACKUP_DIR/.env.backup
cp docker-compose.yml $BACKUP_DIR/docker-compose.yml.backup

echo "✅ Backup créé dans $BACKUP_DIR"
```

## 🚀 Procédure de Mise à Jour (Sans Interruption Majeure)

### Étape 1️⃣ : Récupérer les Modifications

```bash
# Se placer dans le répertoire du projet
cd /chemin/vers/portfolio

# Récupérer les dernières modifications
git fetch origin
git pull origin main

# OU si modifications manuelles, copier les nouveaux fichiers :
# - backend/entrypoint.sh (nouveau)
# - backend/Dockerfile (modifié)
# - backend/galleries/models.py (modifié - PrintRequest, PrintRequestItem)
# - backend/galleries/serializers.py (modifié - PrintRequestCreateSerializer)
# - backend/galleries/views.py (modifié - PrintRequestViewSet)
# - backend/galleries/urls.py (modifié - router print-requests)
# - backend/galleries/migrations/0003_printrequest_printrequestitem.py (nouveau)
# - app/components/galleries/PrintRequestModal.jsx (nouveau)
# - app/components/galleries/GalleryGrid.jsx (modifié)
# - app/admin/print-requests/page.js (nouveau)
# - app/admin/AdminLayout.jsx (modifié)
# - app/providers/AuthProvider.js (modifié - getToken)
```

### Étape 2️⃣ : Vérifier les Nouvelles Migrations

```bash
# Lister les migrations pour voir la nouvelle
cat backend/galleries/migrations/0003_printrequest_printrequestitem.py

# Vérifier qu'elle existe bien
ls -la backend/galleries/migrations/
```

### Étape 3️⃣ : Mise à Jour avec Temps d'Arrêt Minimal

**Option A : Mise à jour avec rebuild complet (recommandé)**

```bash
# 1. Arrêter le frontend seulement (le backend reste up)
docker-compose stop frontend

# 2. Rebuild le backend avec les nouvelles migrations
docker-compose build backend

# 3. Arrêter le backend
docker-compose stop backend

# 4. Démarrer le nouveau backend (migrations auto via entrypoint.sh)
docker-compose up -d backend

# 5. Attendre que le backend soit prêt (max 30s)
echo "Attente du backend..."
sleep 10

# 6. Vérifier que les migrations ont été appliquées
docker-compose exec backend python manage.py showmigrations galleries

# Vous devriez voir :
# [X] 0001_initial
# [X] 0002_image_multiple_galleries
# [X] 0003_printrequest_printrequestitem  <-- NOUVEAU

# 7. Rebuild et redémarrer le frontend
docker-compose build frontend
docker-compose up -d frontend

# 8. Redémarrer nginx si nécessaire
docker-compose restart nginx

# 9. Vérifier que tout est OK
docker-compose ps
```

**Option B : Mise à jour hot-reload (si possible)**

```bash
# Appliquer uniquement les migrations sans rebuild
docker-compose exec backend python manage.py migrate

# Redémarrer les conteneurs
docker-compose restart backend frontend
```

### Étape 4️⃣ : Vérifications Post-Mise à Jour

```bash
# 1. Vérifier que tous les conteneurs sont running
docker-compose ps
# Tous doivent être "Up"

# 2. Vérifier les logs pour les erreurs
docker-compose logs backend | tail -50
docker-compose logs backend | grep ERROR

# 3. Vérifier que la migration a été appliquée
docker-compose exec backend python manage.py showmigrations galleries | grep 0003

# Doit afficher :
# [X] 0003_printrequest_printrequestitem

# 4. Vérifier que les tables existent
docker-compose exec backend python manage.py dbshell <<EOF
.tables
.quit
EOF
# Doit lister : galleries_printrequest et galleries_printrequestitem

# 5. Tester l'endpoint (doit retourner 401 sans auth)
curl -i https://votre-domaine.com/api/galleries/print-requests/
# Attendu : HTTP/1.1 401 Unauthorized

# 6. Tester le frontend
curl -i https://votre-domaine.com/
# Attendu : HTTP/1.1 200 OK

# 7. Vérifier le panel admin
# Ouvrir dans le navigateur : https://votre-domaine.com/admin
# Le menu "Impressions" doit apparaître
```

### Étape 5️⃣ : Tests Fonctionnels

1. **Tester l'authentification utilisateur :**
   - Connexion sur le site
   - Accès à une galerie
   - Sélection d'images
   - Le bouton "Demander une impression" doit apparaître

2. **Créer une demande test :**
   - Sélectionner 1-2 images
   - Cliquer sur "Demander une impression"
   - Remplir le formulaire
   - Soumettre
   - Vérifier le message de succès

3. **Vérifier côté admin :**
   - Se connecter au panel admin
   - Aller dans "Impressions"
   - La demande test doit apparaître
   - Tester le changement de statut
   - Tester la suppression

## 🔧 En Cas de Problème

### Problème : Migration échoue

```bash
# Vérifier l'état exact
docker-compose exec backend python manage.py showmigrations galleries

# Si migration à moitié appliquée, forcer :
docker-compose exec backend python manage.py migrate galleries 0003 --fake
docker-compose exec backend python manage.py migrate galleries
```

### Problème : Erreur 500 sur print-requests

```bash
# Vérifier les logs détaillés
docker-compose logs backend | grep -A 20 "print-requests"

# Vérifier que le serializer n'a pas d'erreur
docker-compose exec backend python manage.py shell
>>> from galleries.serializers import PrintRequestCreateSerializer
>>> print(PrintRequestCreateSerializer)
# Ne doit pas générer d'erreur
```

### Problème : Le bouton "Demander une impression" n'apparaît pas

**Causes possibles :**
1. User pas authentifié
2. Frontend pas rebuild correctement
3. Cache navigateur

**Solution :**
```bash
# Rebuild le frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Vider le cache navigateur : Ctrl+Shift+R
```

### Rollback Complet (si échec critique)

```bash
# 1. Arrêter les conteneurs
docker-compose down

# 2. Restaurer la base de données
cp backups/TIMESTAMP/db.sqlite3.backup backend/db.sqlite3

# 3. Restaurer la config si modifiée
cp backups/TIMESTAMP/.env.backup .env
cp backups/TIMESTAMP/docker-compose.yml.backup docker-compose.yml

# 4. Revenir à la version précédente du code
git reset --hard HEAD~1  # Annuler le dernier commit
# OU git checkout <commit-hash-avant-modif>

# 5. Redémarrer
docker-compose up -d

# 6. Vérifier que tout refonctionne comme avant
docker-compose ps
curl https://votre-domaine.com/
```

## 📊 Checklist de Mise à Jour

- [ ] Backup complet effectué (DB + media + config)
- [ ] Code récupéré (git pull ou copie manuelle)
- [ ] Fichier `backend/entrypoint.sh` présent et exécutable
- [ ] Migration `0003_printrequest_printrequestitem.py` présente
- [ ] Backend rebuild
- [ ] Backend redémarré (migrations auto-appliquées)
- [ ] Migrations vérifiées avec `showmigrations`
- [ ] Frontend rebuild
- [ ] Tous les conteneurs "Up"
- [ ] Aucune erreur dans les logs
- [ ] Endpoint `/api/galleries/print-requests/` retourne 401 (protégé)
- [ ] Frontend accessible
- [ ] Menu "Impressions" visible dans admin panel
- [ ] Test création demande réussi
- [ ] Test affichage demande dans admin réussi

## ⏱️ Temps d'Interruption Estimé

- **Avec Option A (rebuild complet)** : ~3-5 minutes
- **Avec Option B (hot-reload)** : ~30 secondes - 1 minute

## 🎉 Résultat Final

Après la mise à jour réussie :
- ✅ Nouveau système de demandes d'impression fonctionnel
- ✅ Toutes les données existantes préservées
- ✅ Aucune interruption des galeries existantes
- ✅ Panel admin enrichi avec gestion des impressions
- ✅ Sécurité JWT maintenue
- ✅ Compatibilité totale avec l'existant

## 📞 Support

En cas de problème pendant la mise à jour :
```bash
# Logs en temps réel
docker-compose logs -f backend

# État des conteneurs
docker-compose ps

# Shell Django pour debug
docker-compose exec backend python manage.py shell
```
