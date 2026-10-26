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


class MigrateV1DataCommandTests(TestCase):
    def test_migration_from_v1_database(self):
        """Verify migrate_v1_data successfully imports all models and relations from a legacy v1 sqlite db."""
        import sqlite3
        import tempfile
        import os
        from django.core.management import call_command

        with tempfile.NamedTemporaryFile(suffix='.sqlite3', delete=False) as f:
            v1_db_path = f.name

        try:
            conn = sqlite3.connect(v1_db_path)
            cur = conn.cursor()

            # 1. Create legacy tables
            cur.execute("""
                CREATE TABLE authentication_customuser (
                    id INTEGER PRIMARY KEY,
                    password VARCHAR(128),
                    last_login DATETIME,
                    is_superuser BOOLEAN,
                    username VARCHAR(150),
                    first_name VARCHAR(150),
                    last_name VARCHAR(150),
                    email VARCHAR(254),
                    is_staff BOOLEAN,
                    is_active BOOLEAN,
                    date_joined DATETIME,
                    role VARCHAR(10),
                    phone VARCHAR(20),
                    bio TEXT,
                    avatar VARCHAR(100),
                    invitation_token VARCHAR(100),
                    invitation_sent_at DATETIME,
                    created_at DATETIME,
                    updated_at DATETIME,
                    invited_by_id INTEGER
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_usergroup (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(100),
                    description TEXT,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_usergroup_members (
                    id INTEGER PRIMARY KEY,
                    usergroup_id INTEGER,
                    customuser_id INTEGER
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_gallery (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(200),
                    slug VARCHAR(200),
                    description TEXT,
                    gallery_type VARCHAR(20),
                    event_key VARCHAR(100),
                    event_date DATE,
                    event_location VARCHAR(255),
                    visibility VARCHAR(10),
                    cover_image VARCHAR(100),
                    created_by_id INTEGER,
                    created_at DATETIME,
                    updated_at DATETIME,
                    is_featured BOOLEAN,
                    display_order INTEGER,
                    allow_download BOOLEAN
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_gallery_allowed_groups (
                    id INTEGER PRIMARY KEY,
                    gallery_id INTEGER,
                    usergroup_id INTEGER
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_image (
                    id INTEGER PRIMARY KEY,
                    image VARCHAR(100),
                    thumbnail VARCHAR(100),
                    title VARCHAR(200),
                    alt_text VARCHAR(200),
                    description TEXT,
                    width INTEGER,
                    height INTEGER,
                    size INTEGER,
                    mime_type VARCHAR(50),
                    display_order INTEGER,
                    is_cover BOOLEAN,
                    views_count INTEGER,
                    downloads_count INTEGER,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_image_galleries (
                    id INTEGER PRIMARY KEY,
                    image_id INTEGER,
                    gallery_id INTEGER
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_printrequest (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    status VARCHAR(20),
                    notes TEXT,
                    admin_notes TEXT,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """)

            cur.execute("""
                CREATE TABLE galleries_printrequestitem (
                    id INTEGER PRIMARY KEY,
                    request_id INTEGER,
                    image_id INTEGER,
                    print_size VARCHAR(10),
                    quantity INTEGER,
                    custom_size VARCHAR(100),
                    created_at DATETIME
                )
            """)

            # 2. Insert dummy legacy data
            cur.execute("""
                INSERT INTO authentication_customuser (id, username, password, email, role, is_staff, is_active, is_superuser)
                VALUES (1, 'legacy_tester', 'pbkdf2_sha256$test$hashed', 'legacy@test.com', 'PRIVATE', 0, 1, 0)
            """)

            cur.execute("""
                INSERT INTO galleries_usergroup (id, name, description)
                VALUES (10, 'Legacy VIPs', 'VIP customers')
            """)

            cur.execute("""
                INSERT INTO galleries_usergroup_members (id, usergroup_id, customuser_id)
                VALUES (1, 10, 1)
            """)

            cur.execute("""
                INSERT INTO galleries_gallery (id, name, slug, description, visibility, gallery_type, is_featured, display_order, allow_download)
                VALUES (20, 'Legacy Wedding Album', 'legacy-wedding', 'Old wedding photos', 'PRIVATE', 'EVENT', 1, 0, 1)
            """)

            cur.execute("""
                INSERT INTO galleries_gallery_allowed_groups (id, gallery_id, usergroup_id)
                VALUES (1, 20, 10)
            """)

            cur.execute("""
                INSERT INTO galleries_image (id, image, title, width, height, display_order)
                VALUES (30, 'galleries/images/vintage_car.jpg', 'Vintage Car', 1920, 1080, 1)
            """)

            cur.execute("""
                INSERT INTO galleries_image_galleries (id, image_id, gallery_id)
                VALUES (1, 30, 20)
            """)

            cur.execute("""
                INSERT INTO galleries_printrequest (id, user_id, status, notes)
                VALUES (40, 1, 'PENDING', 'Need 2 prints on vintage paper')
            """)

            cur.execute("""
                INSERT INTO galleries_printrequestitem (id, request_id, image_id, print_size, quantity, custom_size)
                VALUES (50, 40, 30, '10x15', 2, '')
            """)

            conn.commit()
            conn.close()

            # 3. Execute migration command
            call_command('migrate_v1_data', v1_db_path)

            # 4. Assert migrations in v2 database
            migrated_user = User.objects.filter(username='legacy_tester').first()
            self.assertIsNotNone(migrated_user)
            self.assertEqual(migrated_user.role, 'PRIVATE')
            self.assertEqual(migrated_user.email, 'legacy@test.com')

            migrated_group = AccessGroup.objects.filter(name='Legacy VIPs').first()
            self.assertIsNotNone(migrated_group)
            self.assertTrue(migrated_group.members.filter(id=migrated_user.id).exists())

            migrated_gallery = Gallery.objects.filter(slug='legacy-wedding').first()
            self.assertIsNotNone(migrated_gallery)
            self.assertEqual(migrated_gallery.title, 'Legacy Wedding Album')
            self.assertTrue(migrated_gallery.allowed_groups.filter(id=migrated_group.id).exists())

            migrated_image = Image.objects.filter(file='galleries/images/vintage_car.jpg').first()
            self.assertIsNotNone(migrated_image)
            self.assertEqual(migrated_image.title, 'Vintage Car')
            self.assertTrue(migrated_image.galleries.filter(id=migrated_gallery.id).exists())

            migrated_pr = PrintRequest.objects.filter(user=migrated_user).first()
            self.assertIsNotNone(migrated_pr)
            self.assertEqual(migrated_pr.notes, 'Need 2 prints on vintage paper')
            self.assertEqual(migrated_pr.items.count(), 1)
            item = migrated_pr.items.first()
            self.assertEqual(item.image, migrated_image)
            self.assertEqual(item.quantity, 2)

        finally:
            if os.path.exists(v1_db_path):
                os.remove(v1_db_path)
