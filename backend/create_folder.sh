#!/bin/bash
# Script pour créer les dossiers d'événements

BASE_DIR="/home/emilien/Documents/Perso/portfolio/images"

# Créer le dossier bapteme_alexis
mkdir -p "$BASE_DIR/bapteme_alexis"
cat > "$BASE_DIR/bapteme_alexis/info.txt" << 'EOF'
Date: 15/09/2024
Lieu: Église Saint-Pierre, Versailles
Description: Baptême du petit Alexis en présence de sa famille et ses proches
Type: Baptême
EOF

# Créer le dossier intv
mkdir -p "$BASE_DIR/intv"
cat > "$BASE_DIR/intv/info.txt" << 'EOF'
Date: 22/10/2024
Lieu: Studio Lumière, Paris 15ème
Description: Séance d'interviews et portraits professionnels
Type: Interview/Portrait
EOF

# Créer le dossier photos_entre_amis
mkdir -p "$BASE_DIR/photos_entre_amis"
cat > "$BASE_DIR/photos_entre_amis/info.txt" << 'EOF'
Date: 03/11/2024
Lieu: Parc de Sceaux
Description: Séance photo décontractée entre amis dans un cadre naturel
Type: Portrait de groupe
EOF

echo "Dossiers créés avec succès !"
echo "Structure créée :"
echo "- bapteme_alexis/"
echo "- intv/"
echo "- photos_entre_amis/"
echo "- mariage_thomas/ (existant)"
