#!/bin/bash
# Script de configuration Wazuh pour Portfolio (Blue Team Approach)
# À exécuter sur Proxmox (LXC)

set -e

echo "================================"
echo "Configuration Wazuh - Portfolio"
echo "================================"
echo ""

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# Étape 1: Créer les dossiers de logs
# ========================================
echo -e "${YELLOW}[1/4]${NC} Créating log directories..."
mkdir -p /opt/portfolio/logs/nginx
mkdir -p /opt/portfolio/logs/backend
chmod -R 755 /opt/portfolio/logs
echo -e "${GREEN}✓${NC} Log directories created"
echo ""

# ========================================
# Étape 2: Redémarrer Docker
# ========================================
echo -e "${YELLOW}[2/4]${NC} Restarting Docker services..."
cd /opt/portfolio
docker compose down > /dev/null 2>&1 || true
docker compose up -d > /dev/null 2>&1
sleep 30
echo -e "${GREEN}✓${NC} Docker services restarted"
echo ""

# Vérifier les logs
echo -e "${YELLOW}[Vérification]${NC} Checking log files..."
if [ -f "/opt/portfolio/logs/nginx/access.log" ]; then
    echo -e "${GREEN}✓${NC} Nginx access.log found"
    tail -3 /opt/portfolio/logs/nginx/access.log
else
    echo -e "${RED}✗${NC} Nginx access.log NOT found - waiting..."
    sleep 10
fi
echo ""

# ========================================
# Étape 3: Configurer Wazuh Agent
# ========================================
echo -e "${YELLOW}[3/4]${NC} Configuring Wazuh Agent..."

# Backup de la config actuelle
cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.backup.$(date +%s)

# Trouver la ligne d'insertion (avant </ossec_config>)
CONFIG_FILE="/var/ossec/etc/ossec.conf"

# Vérifier si la config portfolio existe déjà
if grep -q "portfolio Docker Logs" "$CONFIG_FILE"; then
    echo -e "${YELLOW}⚠${NC} Portfolio configuration already exists"
else
    # Ajouter la configuration juste avant </ossec_config>
    sed -i '/<\/ossec_config>/i\
\
  <!-- Portfolio Docker Logs Monitoring -->\
  <!-- Nginx Access Logs -->\
  <localfile>\
    <location>/opt/portfolio/logs/nginx/access.log</location>\
    <log_format>apache</log_format>\
    <alias>nginx-access</alias>\
  </localfile>\
\
  <!-- Nginx Error Logs -->\
  <localfile>\
    <location>/opt/portfolio/logs/nginx/error.log</location>\
    <log_format>apache</log_format>\
    <alias>nginx-error</alias>\
  </localfile>\
\
  <!-- Backend Django Logs -->\
  <localfile>\
    <location>/opt/portfolio/logs/backend/django.log</location>\
    <log_format>syslog</log_format>\
    <alias>backend-django</alias>\
  </localfile>\
\
  <!-- Docker Container Listener -->\
  <wodle name="docker-listener">\
    <interval>10m</interval>\
    <attempts>5</attempts>\
    <run_on_start>yes</run_on_start>\
    <disabled>no</disabled>\
  </wodle>\
' "$CONFIG_FILE"
    
    echo -e "${GREEN}✓${NC} Wazuh configuration updated"
fi
echo ""

# ========================================
# Étape 4: Redémarrer l'agent Wazuh
# ========================================
echo -e "${YELLOW}[4/4]${NC} Restarting Wazuh Agent..."
sudo systemctl restart wazuh-agent
sleep 5

# Vérifier le statut
if sudo systemctl is-active --quiet wazuh-agent; then
    echo -e "${GREEN}✓${NC} Wazuh Agent is running"
else
    echo -e "${RED}✗${NC} Wazuh Agent failed to start"
    sudo systemctl status wazuh-agent
    exit 1
fi
echo ""

# ========================================
# Vérifications finales
# ========================================
echo -e "${YELLOW}[Vérifications]${NC} Final checks..."
echo ""

echo "Agent Status:"
sudo systemctl status wazuh-agent | grep Active

echo ""
echo "Recent Agent Logs:"
tail -5 /var/ossec/logs/ossec.log

echo ""
echo "Portfolio Configuration:"
grep -A 2 "portfolio Docker" /var/ossec/etc/ossec.conf | head -5

echo ""
echo -e "${GREEN}================================"
echo "✓ Configuration Complete!"
echo "================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Wazuh Manager rules: /var/ossec/etc/rules/portfolio.xml"
echo "2. Generate traffic on https://paulatreides.fr"
echo "3. View alerts in Wazuh Dashboard"
echo ""
echo "Useful commands:"
echo "  - View logs: tail -f /opt/portfolio/logs/nginx/access.log"
echo "  - Restart agent: sudo systemctl restart wazuh-agent"
echo "  - Check connection: tail -50 /var/ossec/logs/ossec.log | grep -i portfolio"
echo ""
