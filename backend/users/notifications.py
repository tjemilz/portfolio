"""
Notification service for security alerts via ntfy.
Sends notifications when users login, including IP and client metadata.
"""

import logging
from datetime import datetime
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class NtfyNotificationService:
    """Service to send security and login notifications via ntfy."""
    
    def __init__(self):
        self.enabled = getattr(settings, 'NTFY_ENABLED', False)
        self.server_url = getattr(settings, 'NTFY_SERVER_URL', 'https://ntfy.sh')
        self.topic_success = getattr(settings, 'NTFY_TOPIC_SUCCESS', 'portfolio-login-success')
        self.topic_failed = getattr(settings, 'NTFY_TOPIC_FAILED', 'portfolio-login-failed')
        self.auth_token = getattr(settings, 'NTFY_AUTH_TOKEN', None)
    
    def send_notification(self, topic, title, message, priority='default', tags=None):
        """
        Send a notification via ntfy.
        """
        if not self.enabled:
            logger.debug(f"Ntfy disabled. Topic: {topic} | Title: {title}")
            return False
        
        try:
            url = f"{self.server_url}/{topic}"
            headers = {
                'Title': title,
                'Priority': priority,
            }
            if tags:
                headers['Tags'] = ','.join(tags)
            if self.auth_token:
                headers['Authorization'] = f'Bearer {self.auth_token}'
            
            response = requests.post(
                url,
                data=message.encode('utf-8'),
                headers=headers,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ntfy notification failed: {e}")
            return False
    
    def get_client_ip(self, request):
        """Extract originating client IP from Cloudflare or X-Forwarded-For headers."""
        if not request:
            return 'Unknown'
        cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            return cf_ip
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'Unknown')

    def get_client_country(self, request):
        if not request:
            return None
        return request.META.get('HTTP_CF_IPCOUNTRY')

    def notify_login_success(self, user, request):
        ip = self.get_client_ip(request)
        country = self.get_client_country(request)
        country_str = f" ({country})" if country else ""
        title = f"🔐 Connexion: {user.username}"
        message = (
            f"✅ Connexion réussie\n\n"
            f"👤 Utilisateur: {user.username}\n"
            f"📧 Email: {user.email}\n"
            f"🎭 Rôle: {user.role}\n"
            f"🌐 IP: {ip}{country_str}\n"
            f"🕒 Heure: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        )
        self.send_notification(
            topic=self.topic_success,
            title=title,
            message=message,
            priority='default',
            tags=['lock', 'white_check_mark']
        )

    def notify_login_failed(self, username, request, reason=None):
        ip = self.get_client_ip(request)
        country = self.get_client_country(request)
        country_str = f" ({country})" if country else ""
        title = f"⚠️ Échec connexion: {username}"
        message = (
            f"❌ Tentative de connexion rejetée\n\n"
            f"👤 Identifiant: {username}\n"
            f"🌐 IP: {ip}{country_str}\n"
            f"⚠️ Raison: {reason or 'Identifiants invalides'}\n"
            f"🕒 Heure: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        )
        self.send_notification(
            topic=self.topic_failed,
            title=title,
            message=message,
            priority='high',
            tags=['warning', 'no_entry']
        )


ntfy_service = NtfyNotificationService()
