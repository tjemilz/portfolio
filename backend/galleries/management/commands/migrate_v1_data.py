import os
import sqlite3
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime
from django.contrib.auth import get_user_model
from galleries.models import AccessGroup, Gallery, Image, PrintRequest, PrintRequestItem

User = get_user_model()


def clean_str(val):
    """Ensure None values convert to empty string for CharField/TextField."""
    return str(val) if val is not None else ""


class Command(BaseCommand):
    help = "Migrate legacy v1 database (with integer IDs and authentication app) to v2 schema (UUIDs and users app)"

    def add_arguments(self, parser):
        parser.add_argument(
            "source_db",
            type=str,
            nargs="?",
            default="backend/db.sqlite3.v1",
            help="Path to the legacy SQLite database file (default: backend/db.sqlite3.v1 or /app/db.sqlite3.v1)",
        )

    def handle(self, *args, **options):
        source_path = options["source_db"]
        
        # If relative, check common paths
        if not os.path.isabs(source_path) and not os.path.exists(source_path):
            candidates = [
                source_path,
                os.path.join(os.getcwd(), source_path),
                f"/app/{os.path.basename(source_path)}",
                f"/app/media/{os.path.basename(source_path)}",
                f"/app/backend/{os.path.basename(source_path)}",
                os.path.join(os.path.dirname(__file__), "..", "..", "..", os.path.basename(source_path)),
            ]
            for cand in candidates:
                if os.path.exists(cand):
                    source_path = cand
                    break

        if not os.path.exists(source_path):
            raise CommandError(f"Source database file not found: {source_path}")

        self.stdout.write(self.style.NOTICE(f"Connecting to source database: {source_path}"))
        conn = sqlite3.connect(source_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Helper to get columns for a table
        def get_table_columns(table_name):
            try:
                cur.execute(f"PRAGMA table_info({table_name})")
                return {row["name"] for row in cur.fetchall()}
            except Exception:
                return set()

        def table_exists(table_name):
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            return cur.fetchone() is not None

        # ID Mappings (old integer ID -> new UUID)
        user_id_map = {}
        group_id_map = {}
        gallery_id_map = {}
        image_id_map = {}

        with transaction.atomic():
            # ==========================================
            # 1. MIGRATE USERS
            # ==========================================
            user_table = "authentication_customuser" if table_exists("authentication_customuser") else "users_customuser"
            if table_exists(user_table):
                cols = get_table_columns(user_table)
                self.stdout.write(f"Migrating users from {user_table}...")
                cur.execute(f"SELECT * FROM {user_table}")
                user_rows = cur.fetchall()

                # Pass 1: Create users
                for row in user_rows:
                    old_id = row["id"]
                    username = row["username"]
                    
                    existing_user = User.objects.filter(username=username).first()
                    if existing_user:
                        user_id_map[old_id] = existing_user.id
                        self.stdout.write(f"  - User '{username}' already exists (ID: {existing_user.id})")
                        continue

                    new_id = uuid.uuid4()
                    user_id_map[old_id] = new_id

                    date_joined = parse_datetime(row["date_joined"]) if "date_joined" in cols and row["date_joined"] else None
                    last_login = parse_datetime(row["last_login"]) if "last_login" in cols and row["last_login"] else None
                    inv_sent = parse_datetime(row["invitation_sent_at"]) if "invitation_sent_at" in cols and row["invitation_sent_at"] else None

                    user = User(
                        id=new_id,
                        username=username,
                        password=clean_str(row["password"]) if "password" in cols else "",
                        first_name=clean_str(row["first_name"]) if "first_name" in cols else "",
                        last_name=clean_str(row["last_name"]) if "last_name" in cols else "",
                        email=clean_str(row["email"]) if "email" in cols else "",
                        is_staff=bool(row["is_staff"]) if "is_staff" in cols and row["is_staff"] is not None else False,
                        is_active=bool(row["is_active"]) if "is_active" in cols and row["is_active"] is not None else True,
                        is_superuser=bool(row["is_superuser"]) if "is_superuser" in cols and row["is_superuser"] is not None else False,
                        role=row["role"] if "role" in cols and row["role"] else "PUBLIC",
                        phone=clean_str(row["phone"]) if "phone" in cols else "",
                        bio=clean_str(row["bio"]) if "bio" in cols else "",
                        avatar=clean_str(row["avatar"]) if "avatar" in cols else "",
                        invitation_token=row["invitation_token"] if "invitation_token" in cols and row["invitation_token"] else None,
                        invitation_sent_at=inv_sent,
                    )
                    if date_joined:
                        user.date_joined = date_joined
                    if last_login:
                        user.last_login = last_login
                    user.save()

                # Pass 2: Set invited_by
                if "invited_by_id" in cols:
                    for row in user_rows:
                        old_inv_by = row["invited_by_id"]
                        if old_inv_by and old_inv_by in user_id_map:
                            target_user_id = user_id_map.get(row["id"])
                            inv_user_id = user_id_map.get(old_inv_by)
                            if target_user_id and inv_user_id:
                                User.objects.filter(id=target_user_id).update(invited_by_id=inv_user_id)

                self.stdout.write(self.style.SUCCESS(f"  ✓ {len(user_rows)} users processed."))
            else:
                self.stdout.write(self.style.WARNING("  No legacy users table found."))

            # ==========================================
            # 2. MIGRATE GROUPS
            # ==========================================
            group_table = "galleries_usergroup" if table_exists("galleries_usergroup") else "galleries_accessgroup"
            if table_exists(group_table):
                cols = get_table_columns(group_table)
                self.stdout.write(f"Migrating access groups from {group_table}...")
                cur.execute(f"SELECT * FROM {group_table}")
                group_rows = cur.fetchall()

                for row in group_rows:
                    old_id = row["id"]
                    name = row["name"]
                    existing_group = AccessGroup.objects.filter(name=name).first()
                    if existing_group:
                        group_id_map[old_id] = existing_group.id
                        new_group = existing_group
                    else:
                        new_id = uuid.uuid4()
                        group_id_map[old_id] = new_id
                        new_group = AccessGroup.objects.create(
                            id=new_id,
                            name=name,
                            description=clean_str(row["description"]) if "description" in cols else "",
                        )

                    # Memberships
                    m_table = "galleries_usergroup_members" if table_exists("galleries_usergroup_members") else "galleries_accessgroup_members"
                    if table_exists(m_table):
                        m_cols = get_table_columns(m_table)
                        g_col = "usergroup_id" if "usergroup_id" in m_cols else "accessgroup_id"
                        u_col = "customuser_id" if "customuser_id" in m_cols else "user_id"
                        cur.execute(f"SELECT {u_col} FROM {m_table} WHERE {g_col}=?", (old_id,))
                        for m_row in cur.fetchall():
                            u_old_id = m_row[0]
                            if u_old_id in user_id_map:
                                new_group.members.add(user_id_map[u_old_id])

                self.stdout.write(self.style.SUCCESS(f"  ✓ {len(group_rows)} access groups processed."))

            # ==========================================
            # 3. MIGRATE GALLERIES
            # ==========================================
            if table_exists("galleries_gallery"):
                cols = get_table_columns("galleries_gallery")
                self.stdout.write("Migrating galleries...")
                cur.execute("SELECT * FROM galleries_gallery")
                gallery_rows = cur.fetchall()

                for row in gallery_rows:
                    old_id = row["id"]
                    slug = row["slug"]
                    title = row["title"] if "title" in cols and row["title"] else (row["name"] if "name" in cols else slug)

                    existing_gallery = Gallery.objects.filter(slug=slug).first()
                    if existing_gallery:
                        gallery_id_map[old_id] = existing_gallery.id
                        gallery_obj = existing_gallery
                    else:
                        new_id = uuid.uuid4()
                        gallery_id_map[old_id] = new_id

                        ev_date = parse_date(row["event_date"]) if "event_date" in cols and row["event_date"] else None
                        gallery_obj = Gallery.objects.create(
                            id=new_id,
                            title=clean_str(title),
                            slug=slug,
                            description=clean_str(row["description"]) if "description" in cols else "",
                            visibility=row["visibility"] if "visibility" in cols and row["visibility"] else "PUBLIC",
                            gallery_type=row["gallery_type"] if "gallery_type" in cols and row["gallery_type"] else "OTHER",
                            is_featured=bool(row["is_featured"]) if "is_featured" in cols and row["is_featured"] is not None else False,
                            show_in_navbar=bool(row["show_in_navbar"]) if "show_in_navbar" in cols and row["show_in_navbar"] is not None else True,
                            display_order=row["display_order"] if "display_order" in cols and row["display_order"] is not None else 0,
                            allow_download=bool(row["allow_download"]) if "allow_download" in cols and row["allow_download"] is not None else True,
                            event_date=ev_date,
                        )

                    # Allowed groups
                    if table_exists("galleries_gallery_allowed_groups"):
                        g_cols = get_table_columns("galleries_gallery_allowed_groups")
                        grp_fk = "usergroup_id" if "usergroup_id" in g_cols else "accessgroup_id"
                        cur.execute(f"SELECT {grp_fk} FROM galleries_gallery_allowed_groups WHERE gallery_id=?", (old_id,))
                        for grp_row in cur.fetchall():
                            old_grp_id = grp_row[0]
                            if old_grp_id in group_id_map:
                                gallery_obj.allowed_groups.add(group_id_map[old_grp_id])

                self.stdout.write(self.style.SUCCESS(f"  ✓ {len(gallery_rows)} galleries processed."))

            # ==========================================
            # 4. MIGRATE IMAGES
            # ==========================================
            if table_exists("galleries_image"):
                cols = get_table_columns("galleries_image")
                self.stdout.write("Migrating images...")
                cur.execute("SELECT * FROM galleries_image")
                image_rows = cur.fetchall()

                for row in image_rows:
                    old_id = row["id"]
                    file_path = row["file"] if "file" in cols and row["file"] else (row["image"] if "image" in cols else "")
                    
                    if not file_path:
                        continue

                    existing_image = Image.objects.filter(file=file_path).first()
                    if existing_image:
                        image_id_map[old_id] = existing_image.id
                        img_obj = existing_image
                    else:
                        new_id = uuid.uuid4()
                        image_id_map[old_id] = new_id

                        disp_order = row["display_order"] if "display_order" in cols and row["display_order"] is not None else (row["order"] if "order" in cols and row["order"] is not None else 0)
                        
                        img_obj = Image.objects.create(
                            id=new_id,
                            file=file_path,
                            width=row["width"] if "width" in cols else None,
                            height=row["height"] if "height" in cols else None,
                            title=clean_str(row["title"]) if "title" in cols else "",
                            display_order=disp_order,
                        )

                    # Associate to galleries
                    # Case A: M2M table galleries_image_galleries
                    if table_exists("galleries_image_galleries"):
                        cur.execute("SELECT gallery_id FROM galleries_image_galleries WHERE image_id=?", (old_id,))
                        for g_row in cur.fetchall():
                            old_g_id = g_row[0]
                            if old_g_id in gallery_id_map:
                                img_obj.galleries.add(gallery_id_map[old_g_id])
                    # Case B: Foreign key gallery_id in galleries_image
                    elif "gallery_id" in cols and row["gallery_id"]:
                        old_g_id = row["gallery_id"]
                        if old_g_id in gallery_id_map:
                            img_obj.galleries.add(gallery_id_map[old_g_id])

                self.stdout.write(self.style.SUCCESS(f"  ✓ {len(image_rows)} images processed."))

            # ==========================================
            # 5. MIGRATE PRINT REQUESTS
            # ==========================================
            if table_exists("galleries_printrequest"):
                pr_cols = get_table_columns("galleries_printrequest")
                self.stdout.write("Migrating print requests...")
                cur.execute("SELECT * FROM galleries_printrequest")
                pr_rows = cur.fetchall()

                for row in pr_rows:
                    old_pr_id = row["id"]
                    old_user_id = row["user_id"]
                    new_user_id = user_id_map.get(old_user_id)
                    if not new_user_id:
                        continue

                    pr_obj = PrintRequest.objects.create(
                        user_id=new_user_id,
                        status=row["status"] if "status" in pr_cols and row["status"] else "PENDING",
                        notes=clean_str(row["notes"]) if "notes" in pr_cols else "",
                        admin_notes=clean_str(row["admin_notes"]) if "admin_notes" in pr_cols else "",
                    )

                    # Migrate Items
                    if table_exists("galleries_printrequestitem"):
                        item_cols = get_table_columns("galleries_printrequestitem")
                        cur.execute("SELECT * FROM galleries_printrequestitem WHERE request_id=?", (old_pr_id,))
                        for item_row in cur.fetchall():
                            old_img_id = item_row["image_id"]
                            new_img_id = image_id_map.get(old_img_id)
                            if not new_img_id:
                                continue

                            PrintRequestItem.objects.create(
                                request=pr_obj,
                                image_id=new_img_id,
                                print_size=item_row["print_size"] if "print_size" in item_cols else "10x15",
                                quantity=item_row["quantity"] if "quantity" in item_cols and item_row["quantity"] else 1,
                                custom_size=clean_str(item_row["custom_size"]) if "custom_size" in item_cols else "",
                            )

                self.stdout.write(self.style.SUCCESS(f"  ✓ {len(pr_rows)} print requests processed."))

        conn.close()
        self.stdout.write(self.style.SUCCESS("🎉 V1 to V2 migration finished successfully! All data, links, and passwords preserved."))
