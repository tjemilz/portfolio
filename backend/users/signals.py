"""
Django signals for authentication events.
"""

import logging
from django.dispatch import receiver
from django.contrib.auth.signals import user_login_failed
from .notifications import ntfy_service

logger = logging.getLogger(__name__)


@receiver(user_login_failed)
def on_user_login_failed(sender, credentials, request, **kwargs):
    username = credentials.get('username', 'Unknown')
    ip = ntfy_service.get_client_ip(request) if request else 'Unknown'
    logger.warning(f"AUTH_FAILED: User '{username}' | IP: {ip}")
    if request:
        ntfy_service.notify_login_failed(username, request)
