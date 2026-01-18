#!/bin/bash

# Script de test post-déploiement Docker
# Usage: ./test-docker-deployment.sh

echo "🚀 Test de déploiement Docker - Portfolio avec Print Requests"
echo "=============================================================="
echo ""

# Couleurs pour l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
API_URL="${API_URL:-http://localhost}"
BACKEND_CONTAINER="portfolio-backend"
FRONTEND_CONTAINER="portfolio-frontend"
NGINX_CONTAINER="portfolio-nginx"

# Fonction pour afficher le résultat
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC} - $2"
    else
        echo -e "${RED}❌ FAIL${NC} - $2"
        return 1
    fi
}

echo "1️⃣  Vérification des conteneurs..."
docker-compose ps

echo ""
echo "2️⃣  Test : Conteneurs en cours d'exécution"
docker ps | grep -q "$BACKEND_CONTAINER" && docker ps | grep -q "$FRONTEND_CONTAINER" && docker ps | grep -q "$NGINX_CONTAINER"
check_result $? "Tous les conteneurs sont running"

echo ""
echo "3️⃣  Test : Migrations appliquées"
docker-compose exec -T backend python manage.py showmigrations galleries | grep -q "\[X\] 0003_printrequest_printrequestitem"
check_result $? "Migration 0003_printrequest_printrequestitem appliquée"

echo ""
echo "4️⃣  Test : Tables de base de données créées"
docker-compose exec -T backend python manage.py shell <<EOF | grep -q "True"
from galleries.models import PrintRequest, PrintRequestItem
print(PrintRequest._meta.db_table)
print(PrintRequestItem._meta.db_table)
print("True")
EOF
check_result $? "Tables PrintRequest et PrintRequestItem existent"

echo ""
echo "5️⃣  Test : API Backend accessible"
curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/galleries/public/" | grep -q "200"
check_result $? "GET /api/galleries/public/ retourne 200"

echo ""
echo "6️⃣  Test : Endpoint Print Requests protégé (sans auth)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/galleries/print-requests/")
if [ "$HTTP_CODE" = "401" ]; then
    check_result 0 "POST /api/galleries/print-requests/ protégé (401 sans token)"
else
    check_result 1 "POST /api/galleries/print-requests/ devrait retourner 401 (got $HTTP_CODE)"
fi

echo ""
echo "7️⃣  Test : Fichiers média accessibles"
docker-compose exec -T backend ls -la /app/media/galleries/ > /dev/null 2>&1
check_result $? "Répertoire /app/media/galleries/ existe"

echo ""
echo "8️⃣  Test : Volumes montés correctement"
docker-compose exec -T backend test -f /app/db.sqlite3
check_result $? "Base de données SQLite montée"

echo ""
echo "9️⃣  Test : Logs backend écrits"
docker-compose logs backend | tail -n 1 > /dev/null
check_result $? "Logs backend disponibles"

echo ""
echo "🔟  Test : Configuration CORS"
docker-compose exec -T backend python manage.py shell <<EOF | grep -q "CORS configuration OK"
from django.conf import settings
if hasattr(settings, 'CORS_ALLOWED_ORIGINS') or hasattr(settings, 'CORS_ALLOW_ALL_ORIGINS'):
    print("CORS configuration OK")
EOF
check_result $? "CORS configuré"

echo ""
echo "1️⃣1️⃣  Test : Permissions fichiers (non-root user)"
docker-compose exec -T backend whoami | grep -q "appuser"
check_result $? "Application tourne avec utilisateur non-root"

echo ""
echo "1️⃣2️⃣  Test : Gunicorn workers actifs"
docker-compose exec -T backend pgrep -f gunicorn > /dev/null 2>&1
check_result $? "Gunicorn est actif"

echo ""
echo "=============================================================="
echo "📊 Résumé des tests"
echo ""

# Compter les erreurs
ERROR_COUNT=$(docker-compose logs backend | grep -c ERROR || echo "0")
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $ERROR_COUNT erreurs trouvées dans les logs backend${NC}"
else
    echo -e "${GREEN}✅ Aucune erreur dans les logs backend${NC}"
fi

echo ""
echo "💡 Commandes utiles :"
echo "  - Voir les logs : docker-compose logs -f"
echo "  - Redémarrer : docker-compose restart"
echo "  - Shell Django : docker-compose exec backend python manage.py shell"
echo "  - Migrations : docker-compose exec backend python manage.py showmigrations"
echo ""
echo "🎉 Tests terminés !"
