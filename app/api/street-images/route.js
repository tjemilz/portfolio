import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const directoryPath = path.join(process.cwd(), 'public/streets');
    
    // Vérifier si le répertoire existe
    if (!fs.existsSync(directoryPath)) {
      return NextResponse.json({ images: [] }, { status: 200 });
    }
    
    // Lire les fichiers du répertoire
    const files = fs.readdirSync(directoryPath);
    
    // Filtrer pour ne garder que les fichiers image
    const imageFiles = files.filter(file => {
      const extension = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
    });
    
    return NextResponse.json({ images: imageFiles }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}