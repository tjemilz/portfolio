"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useExploreImages } from './useExploreImages';

export default function ExplorePage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const { images } = useExploreImages();

  // Fonction pour ouvrir l'image en vue détaillée
  const openImage = (image) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden'; // Empêche le défilement du fond
  };

  // Fonction pour fermer la vue détaillée
  const closeImage = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto'; // Réactive le défilement
  };

  return (
    <div className="flex flex-col items-center px-6 py-12 mt-16">
      <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-6 text-center text-black">Explore</h1>
      
      <p className="text-lg text-center max-w-2xl mb-12 text-gray-700">
        An invitation to wander and discover the world through a different lens. 
        This collection showcases diverse landscapes, cultures, and moments that capture the spirit of exploration.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="aspect-square relative overflow-hidden group cursor-pointer"
            onClick={() => openImage(image)}
          >
            <Image
              src={`/explore/${image}`}
              alt={`Exploration photograph ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
          </div>
        ))}
      </div>

      {/* Modal pour afficher l'image en grand format */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImage}
        >
          <div className="relative max-h-full max-w-full">
            <button 
              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 w-10 h-10 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                closeImage();
              }}
            >
              ×
            </button>
            <Image
              src={`/explore/${selectedImage}`}
              alt="Enlarged photograph"
              width={1200}
              height={800}
              className="max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-2">{selectedImage}</p>
          </div>
        </div>
      )}
    </div>
  );
}