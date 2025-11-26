# backend/generate_images_json.py
import os
import json
from pathlib import Path

def generate_images_json():
    """Génère un fichier JSON avec la liste des vraies images pour chaque événement"""
    images_base_dir = "/home/emilien/Documents/Perso/portfolio/images"
    output_file = "/home/emilien/Documents/Perso/portfolio/backend/static/images_data.json"
    
    # URL de base pour servir les images (nous allons servir les images statiquement)
    base_url = "http://localhost:3000/api/images"
    
    events_data = {}
    
    # Parcourir chaque dossier d'événement
    for event_folder in os.listdir(images_base_dir):
        event_path = os.path.join(images_base_dir, event_folder)
        
        if not os.path.isdir(event_path):
            continue
            
        # Lire le fichier info.txt s'il existe
        info_file = os.path.join(event_path, "info.txt")
        event_info = {}
        
        if os.path.exists(info_file):
            with open(info_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if ':' in line and not line.startswith('//'):
                        key, value = line.split(':', 1)
                        event_info[key.strip()] = value.strip()
        
        # Scanner les images
        images = []
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG']
        
        for filename in sorted(os.listdir(event_path)):
            if any(filename.endswith(ext) for ext in image_extensions):
                image_data = {
                    "id": len(images) + 1,
                    "title": Path(filename).stem,
                    "filename": filename,
                    "image_url": f"{base_url}/{event_folder}/{filename}",
                    "created_at": "2024-01-01T00:00:00Z"  # Placeholder date
                }
                images.append(image_data)
        
        # Mapper les noms de dossiers aux event_keys
        event_key_mapping = {
            'mariage_thomas': 'mariagethomas',
            'bapteme_alexis': 'baptemealexis',
            'intv': 'intv',
            'photos_entre_amis': 'photosentreamis'
        }
        
        event_key = event_key_mapping.get(event_folder, event_folder.replace('_', ''))
        
        events_data[event_key] = {
            "folder": {
                "name": event_info.get('Type', event_folder.replace('_', ' ').title()),
                "description": event_info.get('Description', f"Collection de photos pour {event_folder}"),
                "event_date": event_info.get('Date', ''),
                "event_location": event_info.get('Lieu', ''),
                "event_type": event_info.get('Type', 'Événement'),
                "created_at": "2024-01-01T00:00:00Z"
            },
            "images": images
        }
    
    # Créer le dossier de sortie s'il n'existe pas
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Écrire le fichier JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(events_data, f, indent=2, ensure_ascii=False)
    
    print(f"Fichier JSON généré: {output_file}")
    print(f"Événements traités: {list(events_data.keys())}")
    
    for event_key, data in events_data.items():
        print(f"  {event_key}: {len(data['images'])} images")

if __name__ == "__main__":
    generate_images_json()