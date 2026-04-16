"""
Django settings for portfolio_api project.
"""

import os
import sys
import platform
from pathlib import Path
from datetime import timedelta

# Détection du système d'exploitation
IS_WINDOWS = platform.system() == 'Windows'
IS_LINUX = platform.system() == 'Linux'
IS_MAC = platform.system() == 'Darwin'

# Try to import decouple, fallback to environment variables
try:
    from decouple import config, Csv
except ImportError:
    # Fallback function if python-decouple is not installed
    def config(key, default=None, cast=None):
        value = os.environ.get(key, default)
        if cast and value is not None:
            if cast == bool:
                return value.lower() in ('true', '1', 'yes')
            return cast(value)
        return value
    
    class Csv:
        def __call__(self, value):
            return [x.strip() for x in value.split(',')]

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Local apps
    'authentication',
    'galleries',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',  # Compression GZIP
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'portfolio_api.middleware_protect_media.ProtectMediaMiddleware',  # Protection désactivée
]

ROOT_URLCONF = 'portfolio_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'portfolio_api.wsgi.application'


# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'fr-fr'

TIME_ZONE = 'Europe/Paris'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / config('MEDIA_ROOT', default='media')


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Custom User Model
AUTH_USER_MODEL = 'authentication.CustomUser'


# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'portfolio_api.pagination.StandardPagination',
    'PAGE_SIZE': 20,
}


# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=1440, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}


# CORS Configuration
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# ===========================================
# SECURITY SETTINGS (Production)
# ===========================================

# HTTPS/SSL Settings (activer en production avec HTTPS)
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session & Cookie Security
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# HSTS (HTTP Strict Transport Security) - activer en production avec HTTPS
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)  # 31536000 for 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

# Rate limiting (requires django-ratelimit or similar)
# API_RATE_LIMIT = '100/hour'

# ===========================================
# NTFY Notifications (Security Alerts)
# ===========================================
NTFY_ENABLED = config('NTFY_ENABLED', default=False, cast=bool)
NTFY_SERVER_URL = config('NTFY_SERVER_URL', default='https://ntfy.sh')
NTFY_TOPIC_SUCCESS = config('NTFY_TOPIC_SUCCESS', default='portfolio-login-success')
NTFY_TOPIC_FAILED = config('NTFY_TOPIC_FAILED', default='portfolio-login-failed')
NTFY_AUTH_TOKEN = config('NTFY_AUTH_TOKEN', default=None)  # For private topics

# ===========================================
# LOGGING CONFIGURATION (for Wazuh monitoring)
# ===========================================

# Configuration des handlers selon le système d'exploitation
def get_logging_handlers():
    """Retourne les handlers de logging adaptés au système."""
    handlers = {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    }
    
    # Syslog uniquement disponible sur Linux/Mac
    if IS_LINUX:
        handlers['syslog'] = {
            'level': 'INFO',
            'class': 'logging.handlers.SysLogHandler',
            'address': '/dev/log',
            'formatter': 'wazuh',
            'facility': 'LOG_LOCAL0',
        }
    elif IS_MAC:
        handlers['syslog'] = {
            'level': 'INFO',
            'class': 'logging.handlers.SysLogHandler',
            'address': '/var/run/syslog',
            'formatter': 'wazuh',
            'facility': 'LOG_LOCAL0',
        }
    elif IS_WINDOWS:
        # Sur Windows, utiliser un fichier de log à la place de syslog
        LOG_DIR = BASE_DIR / 'logs'
        LOG_DIR.mkdir(exist_ok=True)
        handlers['file'] = {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'portfolio.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'simple',
        }
    
    return handlers

# Définir les handlers disponibles pour les loggers
def get_logger_handlers():
    """Retourne la liste des handlers à utiliser pour les loggers."""
    if IS_WINDOWS:
        return ['console', 'file']
    else:
        return ['console', 'syslog']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {asctime} {name}: {message}',
            'style': '{',
        },
        'wazuh': {
            'format': 'portfolio[%(process)d]: %(levelname)s %(name)s - %(message)s',
            'style': '%',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': get_logging_handlers(),
    'loggers': {
        'django': {
            'handlers': get_logger_handlers(),
            'level': 'INFO',
            'propagate': True,
        },
        'authentication': {
            'handlers': get_logger_handlers(),
            'level': 'INFO',  # Changé de WARNING à INFO pour capturer les connexions
            'propagate': False,
        },
        'authentication.views': {
            'handlers': get_logger_handlers(),
            'level': 'INFO',  # Changé de WARNING à INFO
            'propagate': False,
        },
        'galleries': {
            'handlers': get_logger_handlers(),
            'level': 'INFO',
            'propagate': False,
        },
    },
}
