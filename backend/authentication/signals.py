"""
Django signals for authentication events.
Captures login successes and failures for security monitoring.
"""

from django.dispatch import receiver
from django.contrib.auth.signals import user_login_failed
import logging

logger = logging.getLogger(__name__)


@receiver(user_login_failed)
def on_user_login_failed(sender, credentials, request, **kwargs):
    """
    Signal handler for failed login attempts.
    Sends notification via ntfy.
    """
    try:
        from .notifications import ntfy_service
        
        username = credentials.get('username', 'Unknown')
        
        # Log the failed attempt
        ip = ntfy_service.get_client_ip(request) if request else 'Unknown'
        logger.warning(f"Failed login attempt for '{username}' from IP: {ip}")
        
        # Send notification
        if request:
            ntfy_service.notify_login_failed(username, request)
            
    except Exception as e:
        logger.error(f"Error in login_failed signal: {e}")
