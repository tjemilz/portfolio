# Configuration Wazuh - Approche Blue Team (Isolation des Logs Docker)

## 🎯 Stratégie d'Isolation (Blue Team)

Le problème classique: **Les logs Docker sont enfermés dans des conteneurs éphémères**. L'agent Wazuh sur l'hôte (LXC) ne peut pas les voir par défaut.

**Solution:** Utiliser les **Volumes Docker** pour exfiltrer les logs vers l'hôte, afin que l'agent puisse les lire comme des fichiers normaux.

---

## ✅ Étape 1: Exfiltrer les Logs (Docker)

Votre `docker-compose.yml` est **déjà configuré** pour exfiltrer:

```yaml
# Backend
volumes:
  - ./logs/backend:/app/logs

# Nginx
volumes:
  - ./logs/nginx:/var/log/nginx
```

### Sur Proxmox, créez les dossiers:

```bash
mkdir -p /opt/portfolio/logs/nginx
mkdir -p /opt/portfolio/logs/backend
chmod -R 755 /opt/portfolio/logs

# Vérifiez que Docker écrit dedans
ls -la /opt/portfolio/logs/nginx/
ls -la /opt/portfolio/logs/backend/
```

### Redémarrez les services:

```bash
cd /opt/portfolio
docker compose down
docker compose up -d
sleep 30

# Vérifiez que les logs apparaissent
tail -20 /opt/portfolio/logs/nginx/access.log
tail -20 /opt/portfolio/logs/nginx/error.log
```

---

## ✅ Étape 2: Configurer l'Agent Wazuh (LXC)

Éditez `/var/ossec/etc/ossec.conf`:

```bash
sudo nano /var/ossec/etc/ossec.conf
```

Trouvez la section `<ossec_config>` et ajoutez (avant la balise fermante `</ossec_config>`):

```xml
<!-- Portfolio Docker Logs Monitoring -->
<!-- Nginx Access Logs -->
<localfile>
  <location>/opt/portfolio/logs/nginx/access.log</location>
  <log_format>apache</log_format>
  <alias>nginx-access</alias>
</localfile>

<!-- Nginx Error Logs -->
<localfile>
  <location>/opt/portfolio/logs/nginx/error.log</location>
  <log_format>apache</log_format>
  <alias>nginx-error</alias>
</localfile>

<!-- Backend (Django) Logs -->
<localfile>
  <location>/opt/portfolio/logs/backend/django.log</location>
  <log_format>syslog</log_format>
  <alias>backend-django</alias>
</localfile>

<!-- Docker Container Listener (détecte la création/suppression de conteneurs) -->
<wodle name="docker-listener">
  <interval>10m</interval>
  <attempts>5</attempts>
  <run_on_start>yes</run_on_start>
  <disabled>no</disabled>
</wodle>
```

### Redémarrez l'agent:

```bash
sudo systemctl restart wazuh-agent

# Vérifiez le statut
sudo systemctl status wazuh-agent
tail -50 /var/ossec/logs/ossec.log | grep -i "portfolio\|docker\|nginx"
```

### Installez le support Docker (si nécessaire):

```bash
sudo pip install docker
sudo systemctl restart wazuh-agent
```

---

## ✅ Étape 3: Configurer les Règles Personnalisées (Wazuh Manager)

### Sur Wazuh Manager, créez `/var/ossec/etc/rules/portfolio.xml`:

```bash
sudo cat > /var/ossec/etc/rules/portfolio.xml << 'EOF'
<!-- Portfolio Security Rules -->
<group name="portfolio,web,">
  
  <!-- Rule for HTTP 401 (Unauthorized) - Failed Authentication -->
  <rule id="100101" level="5">
    <if_sid>30315</if_sid>
    <status>401</status>
    <description>Portfolio: Failed Authentication Attempt (401 Unauthorized)</description>
  </rule>

  <!-- Rule for HTTP 403 (Forbidden) -->
  <rule id="100102" level="4">
    <if_sid>30315</if_sid>
    <status>403</status>
    <description>Portfolio: Access Denied (403 Forbidden)</description>
  </rule>

  <!-- Rule for HTTP 500 (Internal Server Error) -->
  <rule id="100103" level="6">
    <if_sid>30315</if_sid>
    <status>500</status>
    <description>Portfolio: Internal Server Error (500)</description>
  </rule>

  <!-- Rule for HTTP 404 (Not Found) -->
  <rule id="100104" level="3">
    <if_sid>30315</if_sid>
    <status>404</status>
    <description>Portfolio: Page Not Found (404)</description>
  </rule>

  <!-- Brute Force Detection: Multiple 401 from same IP -->
  <rule id="100105" level="7">
    <if_matched_sid>100101</if_matched_sid>
    <same_source_ip />
    <frequency>5</frequency>
    <timeframe>600</timeframe>
    <description>Portfolio: Brute Force Attack - Multiple Failed Authentications</description>
  </rule>

</group>
EOF
```

### Redémarrez Wazuh Manager:

```bash
sudo systemctl restart wazuh-manager

# Vérifiez le statut
sudo systemctl status wazuh-manager

# Vérifiez que le manager a démarré sans erreur
journalctl -xeu wazuh-manager.service | tail -5
```

---

## ✅ Étape 4: Vérification et Test

### Générez du trafic sur votre site:

```bash
# Success (200)
curl https://paulatreides.fr/

# Not Found (404)
curl https://paulatreides.fr/page-inexistante

# Try to login with wrong password (401)
curl -X POST https://paulatreides.fr/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"WRONG"}'
```

### Vérifiez les logs sur l'hôte:

```bash
# Nginx Access Log
tail -20 /opt/portfolio/logs/nginx/access.log

# Nginx Error Log
tail -20 /opt/portfolio/logs/nginx/error.log

# Wazuh Agent (vérifie qu'il lit les fichiers)
tail -100 /var/ossec/logs/ossec.log | grep -i "portfolio\|nginx"
```

### Consultez Wazuh Dashboard:

1. **Ouvrir:** `https://wazuh.yourdomain.com`
2. **Aller à:** **Modules** → **Security Events**
3. **Filtrer par:**
   - `agent.name:proxmox` (ou votre nom d'agent)
   - `group:portfolio`
   - `group:authentication_failed`
   - `group:brute_force`

4. **Créer une visualisation (Dashboard):**
   - Pie Chart: `src_ip` (D'où viennent les requêtes)
   - Time Series: `status_code` (Évolution des erreurs)
   - Table: Tous les 401/403/500

---

## 📊 Métriques Blue Team à Monitorer

| Métrique | Règle | Alert Level | Action |
|----------|-------|-------------|--------|
| Authentification réussie | 100107 | 2 | Informational |
| Authentification échouée (1x) | 100101 | 5 | Log |
| Brute Force (5+ en 10min) | 100105 | 7 | Email Alert |
| SQL Injection/XSS | 100106 | 8 | Immediate Alert |
| Erreur 500 | 100103 | 6 | Email Alert |
| Container Event (Docker Listener) | - | 3-6 | Monitor |

---

## 🔒 Commandes de Diagnostic

```bash
# Sur l'agent Wazuh (LXC):

# Vérifier la connexion à Wazuh Manager
grep -i "connected\|manager" /var/ossec/logs/ossec.log | tail -5

# Lister les fichiers monitorés
grep "<location>" /var/ossec/etc/ossec.conf

# Vérifier que les logs sont lus
find /opt/portfolio/logs -type f -mmin -5  # Fichiers modifiés dans les 5 dernières minutes

# Redémarrer l'agent (si besoin)
sudo systemctl restart wazuh-agent
sudo systemctl status wazuh-agent

# Sur Wazuh Manager:

# Vérifier les agents connectés
/var/ossec/bin/agent_control -l

# Lire les alertes générées
tail -100 /var/ossec/logs/alerts/alerts.json | grep -i portfolio

# Vérifier la syntaxe des règles
/var/ossec/bin/wazuh-control verify-conf
```

---

## 🎯 Prochaines Étapes (Optionnel mais Recommandé)

1. **Configurer les Email Alerts:**
   - Ajouter bloc `<email_notification>` dans `/var/ossec/etc/ossec.conf`
   - SMTP: Gmail ou votre serveur de mail

2. **Activer le Syslog Forwarding:**
   - Envoyer les alertes Wazuh vers un serveur SIEM centralisé

3. **Créer des Dashboards Personnalisés:**
   - Géolocalisation des attaquants (via Cloudflare IP Country)
   - Timeline des accès non autorisés
   - Top 10 des erreurs

4. **Webhook Intégration:**
   - Envoyer les alertes critiques sur Slack/Discord

---

## ❓ Troubleshooting

**Les logs n'apparaissent pas dans `/opt/portfolio/logs/`:**
```bash
# Vérifiez que le volume est monté
docker inspect portfolio-nginx | grep -A 5 "Mounts"

# Forcez une recréation
docker compose down
rm -rf logs/  # ⚠️ Attention: supprime les logs
docker compose up -d
```

**L'agent Wazuh ne voit pas les fichiers:**
```bash
# Vérifiez les permissions
ls -la /opt/portfolio/logs/
sudo chown -R wazuh:wazuh /opt/portfolio/logs  # Si nécessaire
sudo chmod -R 755 /opt/portfolio/logs

# Redémarrez l'agent
sudo systemctl restart wazuh-agent
```

**Pas d'alertes dans Wazuh Dashboard:**
```bash
# Attendez 2-3 minutes (cache)
# Vérifiez que la règle est chargée
grep "id=\"100101\"" /var/ossec/etc/rules/portfolio.xml
# Testez manuellement un accès 401
curl https://paulatreides.fr/admin  # (sans token)
```



