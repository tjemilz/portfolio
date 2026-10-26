"""
Custom authentication backends supporting both HttpOnly cookies and Bearer headers.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


class JWTCookieAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT to read the JWT access token from:
    1. Authorization header ('Bearer <token>')
    2. 'access_token' HttpOnly cookie
    """

    def authenticate(self, request):
        # 1. Attempt standard header authentication
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            # 2. Fall back to secure HttpOnly cookie
            cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        # 3. Validate token
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
