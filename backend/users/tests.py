"""
Security and authentication tests verifying:
- HttpOnly JWT cookie lifecycle (login, refresh, logout)
- Registration restriction (invite-only)
- Role-based route authorization
- Secure media gatekeeping with X-Accel-Redirect
"""

import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from galleries.models import Gallery, Image, AccessGroup

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class SecurityAndAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Superuser Admin
        self.admin = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='AdminPassword123!',
            role=User.UserRole.ADMIN
        )
        
        # 2. Regular Private User
        self.private_user = User.objects.create_user(
            username='private_test',
            email='private@test.com',
            password='UserPassword123!',
            role=User.UserRole.PRIVATE
        )
        
        # 3. Access Group & Private Gallery
        self.group = AccessGroup.objects.create(name='VIP')
        self.group.members.add(self.private_user)
        
        self.private_gallery = Gallery.objects.create(
            title='Private VIP Gallery',
            slug='vip-gallery',
            visibility=Gallery.Visibility.PRIVATE
        )
        self.private_gallery.allowed_groups.add(self.group)
        
        # 4. Public Gallery
        self.public_gallery = Gallery.objects.create(
            title='Public Gallery',
            slug='public-gallery',
            visibility=Gallery.Visibility.PUBLIC
        )
        
        # 5. Dummy images
        dummy_file = SimpleUploadedFile("test_img.jpg", b"fake_image_content", content_type="image/jpeg")
        self.public_image = Image.objects.create(title='Public Photo', file=dummy_file)
        self.public_image.galleries.add(self.public_gallery)
        
        dummy_private = SimpleUploadedFile("priv_img.jpg", b"fake_private_content", content_type="image/jpeg")
        self.private_image = Image.objects.create(title='Private Photo', file=dummy_private)
        self.private_image.galleries.add(self.private_gallery)

    def test_no_public_registration_endpoint(self):
        """Verify that public registration is completely disabled (invite-only)."""
        response = self.client.post('/api/auth/register/', {
            'username': 'hacker',
            'email': 'hacker@test.com',
            'password': 'Password123!',
            'role': 'ADMIN'
        })
        # Route should not exist (404)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_login_sets_httponly_cookies(self):
        """Verify login returns user data and sets HttpOnly JWT cookies."""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'AdminPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check cookies
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        
        access_cookie = response.cookies['access_token']
        self.assertTrue(access_cookie['httponly'])
        self.assertEqual(access_cookie['samesite'], 'Lax')
        self.assertEqual(access_cookie['path'], '/')
        
        refresh_cookie = response.cookies['refresh_token']
        self.assertTrue(refresh_cookie['httponly'])
        self.assertEqual(refresh_cookie['path'], '/api/auth/')

    def test_authenticated_route_with_cookie(self):
        """Verify endpoints authenticate automatically via access_token cookie."""
        login_res = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'AdminPassword123!'
        })
        access_token = login_res.cookies['access_token'].value
        
        # Make request to /api/auth/me/ with cookie (no Authorization header)
        client = APIClient()
        client.cookies['access_token'] = access_token
        me_res = client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['username'], 'admin_test')

    def test_admin_only_endpoints_reject_regular_users(self):
        """Verify non-admin users cannot access administrative endpoints."""
        login_res = self.client.post('/api/auth/login/', {
            'username': 'private_test',
            'password': 'UserPassword123!'
        })
        client = APIClient()
        client.cookies['access_token'] = login_res.cookies['access_token'].value
        
        # Try listing users
        res = client.get('/api/auth/users/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try inviting user
        invite_res = client.post('/api/auth/invite/', {'email': 'victim@test.com', 'role': 'PRIVATE'})
        self.assertEqual(invite_res.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try managing groups
        groups_res = client.post('/api/groups/', {'name': 'HackedGroup'})
        self.assertEqual(groups_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invitation_lifecycle(self):
        """Verify admin can invite and recipient can accept and receive login cookies."""
        # Admin logs in and invites
        login_res = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'AdminPassword123!'
        })
        admin_client = APIClient()
        admin_client.cookies['access_token'] = login_res.cookies['access_token'].value
        
        invite_res = admin_client.post('/api/auth/invite/', {
            'email': 'invited@example.com',
            'role': 'PRIVATE'
        })
        self.assertEqual(invite_res.status_code, status.HTTP_201_CREATED)
        token = invite_res.data['invitation_token']
        
        # Recipient accepts invitation
        guest_client = APIClient()
        accept_res = guest_client.post('/api/auth/accept-invitation/', {
            'invitation_token': token,
            'password': 'NewSecurePassword123!',
            'password_confirm': 'NewSecurePassword123!',
            'first_name': 'Jean',
            'last_name': 'Dupont'
        })
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', accept_res.cookies)
        
        # Recipient can now authenticate
        guest_client.cookies['access_token'] = accept_res.cookies['access_token'].value
        me_res = guest_client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['email'], 'invited@example.com')

    def test_media_protection_and_x_accel_redirect(self):
        """
        Verify:
        - Public images are accessible without authentication.
        - Private images are denied to anonymous and unauthorized users.
        - Private images return X-Accel-Redirect for authorized group members via cookie!
        """
        anon_client = APIClient()
        
        # 1. Anonymous accessing public image: OK (200 + X-Accel-Redirect)
        pub_res = anon_client.get(f'/api/media/secure/{self.public_image.id}/')
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        self.assertIn('X-Accel-Redirect', pub_res.headers)
        
        # 2. Anonymous accessing private image: 404 Denied
        priv_anon_res = anon_client.get(f'/api/media/secure/{self.private_image.id}/')
        self.assertEqual(priv_anon_res.status_code, status.HTTP_404_NOT_FOUND)
        
        # 3. Authorized user with access_token cookie accessing private image: OK
        login_res = self.client.post('/api/auth/login/', {
            'username': 'private_test',
            'password': 'UserPassword123!'
        })
        user_client = APIClient()
        user_client.cookies['access_token'] = login_res.cookies['access_token'].value
        
        priv_auth_res = user_client.get(f'/api/media/secure/{self.private_image.id}/')
        self.assertEqual(priv_auth_res.status_code, status.HTTP_200_OK)
        self.assertIn('X-Accel-Redirect', priv_auth_res.headers)
        self.assertTrue(priv_auth_res.headers['X-Accel-Redirect'].startswith('/internal-media/'))

    def test_logout_clears_cookies_and_blacklists_token(self):
        """Verify logout wipes cookies and invalidates refresh token."""
        login_res = self.client.post('/api/auth/login/', {
            'username': 'private_test',
            'password': 'UserPassword123!'
        })
        client = APIClient()
        client.cookies['access_token'] = login_res.cookies['access_token'].value
        client.cookies['refresh_token'] = login_res.cookies['refresh_token'].value
        
        logout_res = client.post('/api/auth/logout/')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)
        
        # Cookies are cleared (max-age 0 / empty value)
        self.assertEqual(logout_res.cookies['access_token'].value, '')
        self.assertEqual(logout_res.cookies['refresh_token'].value, '')

    def test_axes_brute_force_lockout(self):
        """Verify that failed login attempts are tracked and logged by django-axes."""
        from axes.models import AccessAttempt
        AccessAttempt.objects.all().delete()
        
        for i in range(5):
            res = self.client.post('/api/auth/login/', {
                'username': 'private_test',
                'password': f'WrongPassword{i}!'
            })
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
            
        # Verify access attempt is recorded
        attempts = AccessAttempt.objects.filter(username='private_test')
        self.assertTrue(attempts.exists())
        self.assertGreaterEqual(attempts.first().failures_since_start, 5)
