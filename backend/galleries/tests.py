"""
Tests for galleries, images, access groups, and print requests.
"""

import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import Gallery, Image, AccessGroup, PrintRequest, PrintSize, PrintRequestStatus

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class GalleryAndAccessGroupTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='gallery_admin',
            email='admin@gallery.com',
            password='AdminPassword123!',
            role=User.UserRole.ADMIN
        )
        self.member = User.objects.create_user(
            username='group_member',
            email='member@gallery.com',
            password='MemberPassword123!',
            role=User.UserRole.PRIVATE
        )
        self.stranger = User.objects.create_user(
            username='stranger',
            email='stranger@gallery.com',
            password='StrangerPassword123!',
            role=User.UserRole.PRIVATE
        )

        self.group = AccessGroup.objects.create(name='Family', description='Family members')
        self.group.members.add(self.member)

        self.public_gallery = Gallery.objects.create(
            title='Streets of Paris',
            slug='streets-of-paris',
            description='Street photography in Paris',
            visibility=Gallery.Visibility.PUBLIC,
            gallery_type='STREETS'
        )

        self.private_gallery = Gallery.objects.create(
            title='Private Wedding',
            slug='private-wedding',
            description='Private wedding album',
            visibility=Gallery.Visibility.PRIVATE,
            gallery_type='EVENT'
        )
        self.private_gallery.allowed_groups.add(self.group)

        dummy_file = SimpleUploadedFile("photo.jpg", b"jpeg_content", content_type="image/jpeg")
        self.image = Image.objects.create(title='Eiffel Tower', file=dummy_file)
        self.image.galleries.add(self.public_gallery)

    def test_access_group_membership(self):
        self.assertEqual(str(self.group), 'Family')
        self.assertIn(self.member, self.group.members.all())
        self.assertNotIn(self.stranger, self.group.members.all())
        self.assertIn(self.group, self.member.access_groups.all())

    def test_gallery_filtering_by_user_permissions(self):
        # 1. Anonymous user sees only public gallery
        anon_client = APIClient()
        res = anon_client.get('/api/galleries/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [g['slug'] for g in res.data['results']]
        self.assertIn('streets-of-paris', slugs)
        self.assertNotIn('private-wedding', slugs)

        # 2. Group member sees public AND their private gallery
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get('/api/galleries/')
        slugs_member = [g['slug'] for g in res_member.data['results']]
        self.assertIn('streets-of-paris', slugs_member)
        self.assertIn('private-wedding', slugs_member)

        # 3. Non-member sees only public gallery
        self.client.force_authenticate(user=self.stranger)
        res_stranger = self.client.get('/api/galleries/')
        slugs_stranger = [g['slug'] for g in res_stranger.data['results']]
        self.assertIn('streets-of-paris', slugs_stranger)
        self.assertNotIn('private-wedding', slugs_stranger)

        # 4. Admin sees all galleries
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get('/api/galleries/')
        slugs_admin = [g['slug'] for g in res_admin.data['results']]
        self.assertIn('streets-of-paris', slugs_admin)
        self.assertIn('private-wedding', slugs_admin)

    def test_print_request_flow(self):
        self.client.force_authenticate(user=self.member)
        
        # Create print request
        payload = {
            'notes': 'Please frame in black',
            'items': [
                {
                    'image': str(self.image.id),
                    'print_size': PrintSize.LARGE,
                    'quantity': 2,
                    'custom_size': ''
                }
            ]
        }
        res = self.client.post('/api/galleries/print-requests/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        req_id = res.data['id']

        # Verify created
        req = PrintRequest.objects.get(id=req_id)
        self.assertEqual(req.user, self.member)
        self.assertEqual(req.status, PrintRequestStatus.PENDING)
        self.assertEqual(req.total_items, 1)
        self.assertEqual(req.estimated_total, 80.00) # 40.00 * 2

    def test_navbar_and_featured_toggles(self):
        """Verify admin toggles for featured and navbar, and navbar endpoint filtering."""
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)

        # 1. Toggle featured
        res = admin_client.post(f'/api/galleries/{self.public_gallery.slug}/toggle_featured/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_featured'])
        self.public_gallery.refresh_from_db()
        self.assertTrue(self.public_gallery.is_featured)

        # 2. Toggle navbar off
        res_nav = admin_client.post(f'/api/galleries/{self.public_gallery.slug}/toggle_navbar/')
        self.assertEqual(res_nav.status_code, status.HTTP_200_OK)
        self.assertFalse(res_nav.data['show_in_navbar'])
        self.public_gallery.refresh_from_db()
        self.assertFalse(self.public_gallery.show_in_navbar)

        # 3. Check public navbar endpoint does not include it
        nav_res = self.client.get('/api/galleries/navbar/')
        self.assertEqual(nav_res.status_code, status.HTTP_200_OK)
        slugs = [g['slug'] for g in nav_res.data]
        self.assertNotIn(self.public_gallery.slug, slugs)

        # 4. Toggle navbar back on
        admin_client.post(f'/api/galleries/{self.public_gallery.slug}/toggle_navbar/')
        nav_res2 = self.client.get('/api/galleries/navbar/')
        slugs2 = [g['slug'] for g in nav_res2.data]
        self.assertIn(self.public_gallery.slug, slugs2)

    def test_pending_print_requests(self):
        """Verify pending print requests endpoint returns only pending items."""
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)

        # Create a pending print request
        req = PrintRequest.objects.create(
            user=self.member,
            notes="Pending order",
            status=PrintRequestStatus.PENDING
        )
        res = admin_client.get('/api/galleries/print-requests/pending/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in res.data]
        self.assertIn(req.id, ids)
