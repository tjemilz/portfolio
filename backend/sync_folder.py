# backend/sync_folders.py
import os
import django
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings')
django.setup()

from images.models import PrivateFolder

def sync_physical_folders():
    """Synchronise les dossiers physiques avec la base de données"""
    images_dir = "/home/emilien/Documents/Perso/portfolio/images"
    
    if not os.path.exists(images_dir):
        print(f"Le dossier {images_dir} n'existe pas")
        return
    
    for folder_name in os.listdir(images_dir):
        folder_path = os.path.join(images_dir, folder_name)
        
        # Vérifier que c'est un dossier
        if not os.path.isdir(folder_path):
            continue
            
        # Vérifier s'il contient un fichier info.txt
        info_file = os.path.join(folder_path, 'info.txt')
        if not os.path.exists(info_file):
            print(f"Pas de fichier info.txt dans {folder_name}, ignoré")
            continue
        
        # Créer le slug
        slug = slugify(folder_name)
        
        # Vérifier si le dossier existe déjà en DB
        existing_folder = PrivateFolder.objects.filter(slug=slug).first()
        if existing_folder:
            print(f"Dossier {folder_name} existe déjà en DB")
            continue
        
        # Lire les informations du fichier info.txt
        info_data = {}
        try:
            with open(info_file, 'r', encoding='utf-8') as file:
                for line in file:
                    line = line.strip()
                    if ':' in line and not line.startswith('//'):
                        key, value = line.split(':', 1)
                        info_data[key.strip()] = value.strip()
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier info.txt de {folder_name}: {e}")
            continue
        
        # Créer le dossier en DB
        folder = PrivateFolder.objects.create(
            name=folder_name.replace('_', ' ').title(),
            slug=slug,
            description=info_data.get('Description', f"Événement: {folder_name}"),
            is_active=True
        )
        
        print(f"Dossier créé: {folder.name} (slug: {folder.slug})")
        
        # Afficher les informations récupérées
        if info_data:
            print(f"  - Date: {info_data.get('Date', 'Non spécifiée')}")
            print(f"  - Lieu: {info_data.get('Lieu', 'Non spécifié')}")
            print(f"  - Type: {info_data.get('Type', 'Non spécifié')}")

if __name__ == "__main__":
    sync_physical_folders()
    print("Synchronisation terminée !")