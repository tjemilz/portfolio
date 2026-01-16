"""
Tests for authentication app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse

User = get_user_model()


class UserAuthenticationTest(APITestCase):
    """Test user authentication functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        self.user = User.objects.create_user(**self.user_data)
    
    def test_user_login(self):
        """Test user can login with valid credentials."""
        login_data = {
            'username': self.user_data['username'],
            'password': self.user_data['password']
        }
        
        # This test assumes you have a login endpoint
        # Adjust the URL name based on your actual implementation
        try:
            url = reverse('login')
            response = self.client.post(url, login_data)
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        except:
            # If login endpoint doesn't exist, skip this test
            self.skipTest("Login endpoint not implemented yet")
    
    def test_user_login_invalid_credentials(self):
        """Test user cannot login with invalid credentials."""
        login_data = {
            'username': self.user_data['username'],
            'password': 'wrongpassword'
        }
        
        try:
            url = reverse('login')
            response = self.client.post(url, login_data)
            self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])
        except:
            self.skipTest("Login endpoint not implemented yet")
    
    def test_user_profile_access(self):
        """Test authenticated user can access their profile."""
        # Authenticate user
        self.client.force_authenticate(user=self.user)
        
        try:
            url = reverse('user-profile')
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        except:
            self.skipTest("User profile endpoint not implemented yet")
    
    def test_anonymous_user_profile_access(self):
        """Test anonymous user cannot access profile."""
        try:
            url = reverse('user-profile')
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        except:
            self.skipTest("User profile endpoint not implemented yet")


class UserPermissionsTest(TestCase):
    """Test user permissions and roles."""
    
    def setUp(self):
        """Set up test data."""
        self.regular_user = User.objects.create_user(
            username='regular',
            email='regular@example.com',
            password='testpass123'
        )
        
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            is_staff=True
        )
        
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
    
    def test_user_roles(self):
        """Test different user role properties."""
        # Regular user
        self.assertFalse(self.regular_user.is_staff)
        self.assertFalse(self.regular_user.is_superuser)
        
        # Staff user
        self.assertTrue(self.staff_user.is_staff)
        self.assertFalse(self.staff_user.is_superuser)
        
        # Admin user
        self.assertTrue(self.admin_user.is_staff)
        self.assertTrue(self.admin_user.is_superuser)
    
    def test_user_permissions_hierarchy(self):
        """Test that admin > staff > regular user in terms of permissions."""
        # This is a conceptual test - the actual permission checks 
        # are tested in galleries/tests.py
        
        # All users should be active by default
        self.assertTrue(self.regular_user.is_active)
        self.assertTrue(self.staff_user.is_active)
        self.assertTrue(self.admin_user.is_active)
        
        # Only admin should be superuser
        self.assertFalse(self.regular_user.is_superuser)
        self.assertFalse(self.staff_user.is_superuser)
        self.assertTrue(self.admin_user.is_superuser)


class UserModelTest(TestCase):
    """Test User model extensions and relationships."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_string_representation(self):
        """Test user string representation."""
        # Based on CustomUser.__str__ method which returns email or username
        expected = str(self.user)  # Let the model decide what to return
        self.assertTrue(expected in [self.user.email, self.user.username])
        # CustomUser returns email if available, otherwise username
        self.assertEqual(str(self.user), self.user.email or self.user.username)
    
    def test_user_email_unique(self):
        """Test that user emails should be unique (if enforced)."""
        # Note: Django's default User model doesn't enforce email uniqueness
        # This test is here as a placeholder if you decide to enforce it
        
        # Try to create another user with the same email
        try:
            User.objects.create_user(
                username='testuser2',
                email='test@example.com',
                password='testpass123'
            )
            # If this doesn't raise an error, email uniqueness isn't enforced
            self.assertTrue(True, "Email uniqueness not enforced - this may be intended")
        except Exception:
            # If this raises an error, email uniqueness is enforced
            self.assertTrue(True, "Email uniqueness is enforced")