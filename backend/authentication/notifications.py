"""
Notification service for security alerts via ntfy.
Sends notifications when users login, including IP and user details.
"""

import requests
import logging
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


class NtfyNotificationService:
    """Service to send notifications via ntfy.sh"""
    
    def __init__(self):
        self.enabled = getattr(settings, 'NTFY_ENABLED', False)
        self.server_url = getattr(settings, 'NTFY_SERVER_URL', 'https://ntfy.sh')
        self.topic_success = getattr(settings, 'NTFY_TOPIC_SUCCESS', 'portfolio-login-success')
        self.topic_failed = getattr(settings, 'NTFY_TOPIC_FAILED', 'portfolio-login-failed')
        self.auth_token = getattr(settings, 'NTFY_AUTH_TOKEN', None)
    
    def send_notification(self, topic, title, message, priority='default', tags=None):
        """
        Send a notification via ntfy.
        
        Args:
            topic: The ntfy topic to send to
            title: Notification title
            message: Notification body
            priority: 'min', 'low', 'default', 'high', 'urgent'
            tags: List of emoji tags (e.g., ['warning', 'lock'])
        """
        if not self.enabled:
            logger.debug(f"Ntfy disabled. Would send to {topic}: {title} - {message}")
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
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Ntfy notification sent to {topic}: {title}")
                return True
            else:
                logger.error(f"Ntfy error: {response.status_code} - {response.text}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Ntfy request failed: {e}")
            return False
    
    def notify_login_success(self, user, request):
        """
        Send notification for successful login.
        
        Args:
            user: The authenticated user object
            request: The HTTP request object
        """
        ip_address = self.get_client_ip(request)
        country = self.get_client_country(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        
        # Parse user agent for readable info
        browser_info = self.parse_user_agent(user_agent)
        
        # Country flag emoji (if available)
        country_info = f"🌍 Pays: {country}" if country else ""
        
        title = f"🔐 Connexion: {user.username}"
        
        message = f"""✅ Connexion réussie

👤 Utilisateur: {user.username}
📧 Email: {user.email}
🎭 Rôle: {user.role}
{'👑 Admin' if user.is_superuser else ''}

🌐 IP: {ip_address}
{country_info}
🖥️ {browser_info}
🕐 {timestamp}"""
        
        # Higher priority for admin logins
        priority = 'high' if user.is_superuser or user.is_staff else 'default'
        tags = ['lock', 'white_check_mark']
        
        if user.is_superuser:
            tags.append('crown')
        
        return self.send_notification(self.topic_success, title, message, priority=priority, tags=tags)
    
    def notify_login_failed(self, username, request, reason="Invalid credentials"):
        """
        Send notification for failed login attempt.
        
        Args:
            username: The attempted username
            request: The HTTP request object
            reason: Reason for failure
        """
        ip_address = self.get_client_ip(request)
        country = self.get_client_country(request)
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        
        browser_info = self.parse_user_agent(user_agent)
        
        # Country info (if available)
        country_info = f"🌍 Pays: {country}" if country else ""
        
        title = f"⚠️ Échec connexion: {username}"
        
        message = f"""❌ Tentative de connexion échouée

👤 Username tenté: {username}
❓ Raison: {reason}

🌐 IP: {ip_address}
{country_info}
🖥️ {browser_info}
🕐 {timestamp}"""
        
        return self.send_notification(
            self.topic_failed,
            title, 
            message, 
            priority='high',
            tags=['warning', 'x']
        )
    
    def notify_suspicious_activity(self, description, request, user=None):
        """
        Send notification for suspicious activity.
        
        Args:
            description: Description of the suspicious activity
            request: The HTTP request object
            user: User object if authenticated
        """
        ip_address = self.get_client_ip(request)
        timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        
        title = "🚨 Activité suspecte détectée"
        
        user_info = f"👤 Utilisateur: {user.username}" if user else "👤 Non authentifié"
        
        message = f"""🚨 ALERTE SÉCURITÉ

{description}

{user_info}
🌐 IP: {ip_address}
🕐 {timestamp}"""
        
        return self.send_notification(
            self.topic_failed,
            title,
            message,
            priority='urgent',
            tags=['rotating_light', 'warning']
        )
    
    @staticmethod
    def get_client_ip(request):
        """
        Extract the real client IP from the request.
        Supports Cloudflare Tunnel, Nginx proxy, and direct connections.
        """
        # Priority 1: Cloudflare header (when using Cloudflare Tunnel)
        cf_connecting_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_connecting_ip:
            return cf_connecting_ip
        
        # Priority 2: X-Forwarded-For (behind proxy/nginx)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take the first IP in the chain (original client)
            ip = x_forwarded_for.split(',')[0].strip()
            return ip
        
        # Priority 3: X-Real-IP (nginx)
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip
        
        # Fallback: Direct connection
        return request.META.get('REMOTE_ADDR', 'Unknown')
    
    @staticmethod
    def get_client_country(request):
        """Get the client's country from Cloudflare header."""
        return request.META.get('HTTP_CF_IPCOUNTRY', None)
    
    @staticmethod
    def parse_user_agent(user_agent):
        """Parse user agent string into readable format."""
        ua_lower = user_agent.lower()
        
        # Detect browser
        browser = "Unknown Browser"
        if 'firefox' in ua_lower:
            browser = "Firefox"
        elif 'edg' in ua_lower:
            browser = "Edge"
        elif 'chrome' in ua_lower:
            browser = "Chrome"
        elif 'safari' in ua_lower:
            browser = "Safari"
        elif 'opera' in ua_lower or 'opr' in ua_lower:
            browser = "Opera"
        
        # Detect OS
        os = "Unknown OS"
        if 'windows' in ua_lower:
            os = "Windows"
        elif 'mac os' in ua_lower or 'macos' in ua_lower:
            os = "macOS"
        elif 'linux' in ua_lower:
            os = "Linux"
        elif 'android' in ua_lower:
            os = "Android"
        elif 'iphone' in ua_lower or 'ipad' in ua_lower:
            os = "iOS"
        
        # Detect device type
        device = "Desktop"
        if 'mobile' in ua_lower or 'android' in ua_lower:
            device = "Mobile"
        elif 'tablet' in ua_lower or 'ipad' in ua_lower:
            device = "Tablet"
        
        return f"{browser} sur {os} ({device})"


# Singleton instance
ntfy_service = NtfyNotificationService()
