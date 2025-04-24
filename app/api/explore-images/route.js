import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const directoryPath = path.join(process.cwd(), 'public/explore');
    
    // Vérifier si le répertoire existe
    if (!fs.existsSync(directoryPath)) {
      return NextResponse.json({ 
        images: [],
        message: 'Le répertoire des images Explore est introuvable' 
      }, { status: 200 });
    }
    
    // Lire les fichiers du répertoire
    const files = fs.readdirSync(directoryPath);
    
    // Filtrer pour ne garder que les fichiers image
    const imageFiles = files.filter(file => {
      const extension = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
    });
    
    // Trier les images par nom (optionnel)
    imageFiles.sort();
    
    return NextResponse.json({ 
      images: imageFiles,
      total: imageFiles.length 
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers Explore:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération des images' }, { status: 500 });
  }
}