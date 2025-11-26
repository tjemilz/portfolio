import os
import django
import sys
from datetime import datetime
from PIL import Image as PILImage
import shutil

# Configurer Django
sys.path.append('/home/emilien/Documents/Perso/portfolio/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from images.models import Gallery, Photo
from django.contrib.auth.models import User
from django.core.files import File
from django.core.files.storage import default_storage

def parse_info_file(info_path):
    """Parse le fichier info.txt et retourne les métadonnées"""
    info = {}
    if os.path.exists(info_path):
        with open(info_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower()
                    value = value.strip()
                    
                    if key == 'date':
                        # Convertir différents formats de date
                        try:
                            if '/' in value:
                                info['event_date'] = datetime.strptime(value, '%d/%m/%Y').date()
                            elif '-' in value and len(value) == 10:
                                info['event_date'] = datetime.strptime(value, '%Y-%m-%d').date()
                            else:
                                # Pour les dates comme "2024-2025", prendre la première année
                                year = value.split('-')[0]
                                info['event_date'] = datetime(int(year), 1, 1).date()
                        except:
                            info['event_date'] = None
                    elif key == 'lieu':
                        info['event_location'] = value
                    elif key == 'description':
                        info['description'] = value
                    elif key == 'type':
                        # Mapper les types vers les choix du modèle
                        type_mapping = {
                            'baptême': 'BAPTEME',
                            'mariage': 'MARIAGE',
                            'portrait de groupe': 'FAMILLE',
                            'yearbook': 'PROFESSIONNEL',
                            'anniversaire': 'ANNIVERSAIRE',
                        }
                        info['event_type'] = type_mapping.get(value.lower(), 'EVENEMENT')
    
    return info

def get_image_dimensions(image_path):
    """Récupère les dimensions d'une image"""
    try:
        with PILImage.open(image_path) as img:
            return img.size  # (width, height)
    except:
        return None, None

def import_gallery_from_folder(folder_path, admin_user):
    """Importe une galerie depuis un dossier"""
    folder_name = os.path.basename(folder_path)
    info_file = os.path.join(folder_path, 'info.txt')
    
    print(f"Importation de {folder_name}...")
    
    # Parser les informations
    info = parse_info_file(info_file)
    
    # Créer ou mettre à jour la galerie
    gallery, created = Gallery.objects.get_or_create(
        event_key=folder_name,
        defaults={
            'name': folder_name.replace('_', ' ').title(),
            'description': info.get('description', ''),
            'event_date': info.get('event_date'),
            'event_location': info.get('event_location', ''),
            'event_type': info.get('event_type', 'EVENEMENT'),
            'visibility': 'PRIVATE',
            'created_by': admin_user,
        }
    )
    
    if not created:
        # Mettre à jour les informations si la galerie existe déjà
        gallery.description = info.get('description', gallery.description)
        gallery.event_date = info.get('event_date', gallery.event_date)
        gallery.event_location = info.get('event_location', gallery.event_location)
        gallery.event_type = info.get('event_type', gallery.event_type)
        gallery.save()
    
    # Importer les photos
    imported_count = 0
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.jpg', '.jpeg')) and filename != 'info.txt':
            source_path = os.path.join(folder_path, filename)
            
            # Vérifier si la photo existe déjà
            if not Photo.objects.filter(gallery=gallery, filename=filename).exists():
                try:
                    # Copier l'image vers le dossier media
                    media_path = f'photos/{filename}'
                    destination_path = os.path.join('/home/emilien/Documents/Perso/portfolio/backend/media/photos', filename)
                    
                    # Créer le dossier de destination s'il n'existe pas
                    os.makedirs(os.path.dirname(destination_path), exist_ok=True)
                    
                    # Copier le fichier
                    shutil.copy2(source_path, destination_path)
                    
                    # Obtenir les dimensions
                    width, height = get_image_dimensions(source_path)
                    file_size = os.path.getsize(source_path)
                    
                    # Créer l'objet Photo
                    photo = Photo.objects.create(
                        gallery=gallery,
                        title=f"Photo {filename}",
                        image=media_path,
                        filename=filename,
                        file_size=file_size,
                        width=width,
                        height=height,
                        order=imported_count,
                        uploaded_by=admin_user
                    )
                    
                    imported_count += 1
                    print(f"  - Importé: {filename}")
                    
                except Exception as e:
                    print(f"  - Erreur avec {filename}: {e}")
    
    print(f"✓ {gallery.name}: {imported_count} photos importées")
    return gallery, imported_count

def main():
    """Fonction principale d'importation"""
    images_folder = '/home/emilien/Documents/Perso/portfolio/images'
    
    # Récupérer ou créer un utilisateur admin
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123'
            )
            print("Utilisateur admin créé: admin/admin123")
    except Exception as e:
        print(f"Erreur lors de la création de l'utilisateur admin: {e}")
        return
    
    # Créer les dossiers media nécessaires
    media_dirs = [
        '/home/emilien/Documents/Perso/portfolio/backend/media',
        '/home/emilien/Documents/Perso/portfolio/backend/media/photos',
        '/home/emilien/Documents/Perso/portfolio/backend/media/gallery_covers',
    ]
    
    for media_dir in media_dirs:
        os.makedirs(media_dir, exist_ok=True)
    
    total_galleries = 0
    total_photos = 0
    
    # Parcourir tous les dossiers d'images
    for item in os.listdir(images_folder):
        item_path = os.path.join(images_folder, item)
        
        if os.path.isdir(item_path) and not item.startswith('.'):
            # Vérifier s'il y a des images dans le dossier
            has_images = any(
                f.lower().endswith(('.jpg', '.jpeg')) 
                for f in os.listdir(item_path)
            )
            
            if has_images:
                gallery, photo_count = import_gallery_from_folder(item_path, admin_user)
                total_galleries += 1
                total_photos += photo_count
    
    print(f"\n🎉 Importation terminée!")
    print(f"📁 {total_galleries} galeries importées")
    print(f"📷 {total_photos} photos importées")
    print(f"\nAccédez à l'admin Django: http://localhost:8000/admin/")
    print(f"Utilisateur: admin")
    print(f"Mot de passe: admin123")

if __name__ == '__main__':
    main()