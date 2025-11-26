# backend/create_test_data.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings')
django.setup()

from images.models import PrivateFolder, PrivateImage

# Créer des dossiers de test
folder1 = PrivateFolder.objects.create(
    name="Séance Portrait",
    description="Collection de portraits en studio et extérieur",
    is_active=True
)

folder2 = PrivateFolder.objects.create(
    name="Mariage - Sarah & Tom",
    description="Photos du mariage de Sarah et Tom - Juillet 2024",
    is_active=True
)

folder3 = PrivateFolder.objects.create(
    name="Événement Corporate",
    description="Photos d'entreprise et événements professionnels",
    is_active=True
)

print("Dossiers créés avec succès!")
print(f"Folder 1: {folder1.name} - slug: {folder1.slug}")
print(f"Folder 2: {folder2.name} - slug: {folder2.slug}")
print(f"Folder 3: {folder3.name} - slug: {folder3.slug}")