"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useStreetImages } from './useStreetImages';

export default function StreetsPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { images } = useStreetImages();

  // Fonction pour ouvrir l'image en vue détaillée
  const openImage = (image, index) => {
    setSelectedImage(image);
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden'; // Empêche le défilement du fond
  };

  // Fonction pour fermer la vue détaillée
  const closeImage = () => {
    setSelectedImage(null);
    setSelectedIndex(null);
    document.body.style.overflow = 'auto'; // Réactive le défilement
  };

  // Navigation vers l'image précédente
  const prevImage = (e) => {
    e.stopPropagation();
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setSelectedImage(images[selectedIndex - 1]);
    } else {
      // Boucler vers la dernière image
      setSelectedIndex(images.length - 1);
      setSelectedImage(images[images.length - 1]);
    }
  };

  // Navigation vers l'image suivante
  const nextImage = (e) => {
    e.stopPropagation();
    if (selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setSelectedImage(images[selectedIndex + 1]);
    } else {
      // Boucler vers la première image
      setSelectedIndex(0);
      setSelectedImage(images[0]);
    }
  };

  // Gestion des événements clavier
  const handleKeyDown = (e) => {
    if (selectedImage) {
      if (e.key === 'ArrowLeft') {
        prevImage(e);
      } else if (e.key === 'ArrowRight') {
        nextImage(e);
      } else if (e.key === 'Escape') {
        closeImage();
      }
    }
  };

  // Ajouter un écouteur d'événements clavier
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, selectedIndex]); // Re-ajouter l'écouteur lorsque l'image sélectionnée change

  return (
    <div className="flex flex-col items-center px-6 py-12 mt-16 bg-blue-50 min-h-screen">
      <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-6 text-center text-black">Streets</h1>
      
      <p className="text-lg text-center max-w-2xl mb-12 text-gray-700">
        Capturing the rhythm of urban life, this collection explores the dynamic interactions between people, architecture, and the constant flow of city movements.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="aspect-square relative overflow-hidden group cursor-pointer"
            onClick={() => openImage(image, index)}
          >
            <Image
              src={`/streets/${image}`}
              alt={`Street photograph ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
          </div>
        ))}
      </div>

      {/* Modal pour afficher l'image en grand format avec navigation */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImage}
        >
          {/* Bouton précédent */}
          <button 
            className="absolute left-4 md:left-8 z-10 text-white text-3xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
            onClick={prevImage}
            aria-label="Image précédente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Image et bouton de fermeture */}
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
              src={`/streets/${selectedImage}`}
              alt="Enlarged photograph"
              width={1200}
              height={800}
              className="max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-2">{selectedImage}</p>
            <p className="text-white text-sm text-center opacity-50">{selectedIndex + 1} / {images.length}</p>
          </div>
          
          {/* Bouton suivant */}
          <button 
            className="absolute right-4 md:right-8 z-10 text-white text-3xl bg-black bg-opacity-50 w-12 h-12 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
            onClick={nextImage}
            aria-label="Image suivante"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}