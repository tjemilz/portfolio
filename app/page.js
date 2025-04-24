"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Carousel from "./components/Carousel";
import { useBestOfImages } from "./hooks/useBestOfImages";

export default function Home() {
  const { images, loading } = useBestOfImages();
  const [selectedImage, setSelectedImage] = useState(null);

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
    <div className="flex flex-col items-center min-h-screen">
      {/* Section d'introduction avec hauteur minimale forcée */}
      <div className="flex flex-col items-center justify-center w-full min-h-screen px-6 py-20 md:py-32">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-12 text-black flex flex-col items-center">
          <span className="mb-2">Create.</span>
          <span className="mb-2">Explore.</span>
          <span>Capture.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl text-center mb-16 italic">
          Bienvenue dans mon univers photographique. Un monde où chaque cliché raconte une histoire, 
          chaque regard figé témoigne d'une émotion, et chaque paysage révèle une nouvelle perspective.
        </p>
        
        <div className="animate-bounce flex flex-col items-center opacity-70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <p className="text-sm text-gray-500 mt-2">Défiler pour explorer</p>
        </div>
      </div>
      
      {/* Section galerie */}
      <div className="w-full bg-gray-50 py-24 px-6 md:py-32 md:px-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-black">
            Sélection de photos
          </h2>
          
          {loading ? (
            <div className="w-full max-w-4xl mx-auto flex justify-center items-center h-96">
              <p className="text-gray-500">Chargement des images...</p>
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto">
              <Carousel>
                {images.map((image, index) => (
                  <div key={index} className="min-w-full">
                    <div 
                      className="aspect-[16/9] relative overflow-hidden cursor-pointer"
                      onClick={() => openImage(image)}
                    >
                      <Image 
                        src={`/bestof/${image}`} 
                        alt={`Best of portfolio - ${image}`} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-300"></div>
                    </div>
                  </div>
                ))}
              </Carousel>
            </div>
          )}
        </div>
      </div>
      
      {/* Section citation/vision */}
      <div className="w-full bg-white py-24 px-6 md:py-32 md:px-10 text-center">
        <div className="max-w-4xl mx-auto">
          <blockquote className="text-2xl md:text-3xl font-light italic text-gray-700">
            "La photographie est l'art de capturer l'âme d'un instant qui ne reviendra jamais."
          </blockquote>
          <p className="mt-6 text-gray-500">— Une vision personnelle de la photographie</p>
        </div>
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
              src={`/bestof/${selectedImage}`}
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
