"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Carousel from "./components/Carousel";
import { useBestOfImages } from "./hooks/useBestOfImages";
import dynamic from 'next/dynamic';

// Import dynamique pour éviter les problèmes de SSR avec le canvas
const PointCloudCamera = dynamic(() => import('./components/PointCloudCamera'), {
  ssr: false,
  loading: () => null
});

// Composant simple de parallaxe
const ParallaxSection = ({ children, speed = 0.5 }) => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => setOffset(window.pageYOffset);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div style={{ transform: `translateY(${offset * speed}px)` }}>
      {children}
    </div>
  );
};

// Utiliser l'Intersection Observer API
const FadeInSection = ({ children }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => setVisible(entry.isIntersecting));
    });
    observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div
      ref={domRef}
      className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
};

export default function Home() {
  const { images, loading } = useBestOfImages();
  const [selectedImage, setSelectedImage] = useState(null);
  
  // États pour contrôler l'animation des titres
  const [showCreate, setShowCreate] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  // Effet pour déclencher les animations séquentiellement
  useEffect(() => {
    // Afficher "Create" après 400ms
    const createTimer = setTimeout(() => {
      setShowCreate(true);
    }, 400);
    
    // Afficher "Explore" après 1200ms
    const exploreTimer = setTimeout(() => {
      setShowExplore(true);
    }, 1200);
    
    // Afficher "Capture" après 2000ms
    const captureTimer = setTimeout(() => {
      setShowCapture(true);
    }, 2000);
    
    // Nettoyer les timers lors du démontage du composant
    return () => {
      clearTimeout(createTimer);
      clearTimeout(exploreTimer);
      clearTimeout(captureTimer);
    };
  }, []);

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
      <div className="flex flex-col items-center justify-between w-full min-h-screen px-6 py-20 md:py-32 relative overflow-hidden">
        {/* Nuage de points en forme d'appareil photo */}
        <PointCloudCamera />
        
        {/* Contenu principal centré verticalement */}
        <div className="flex-grow flex flex-col items-center justify-center my-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-12 text-black flex flex-col items-center relative z-10">
            <span 
              className={`mb-2 transition-opacity duration-1000 ease-in-out ${
                showCreate ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Create.
            </span>
            <span 
              className={`mb-2 transition-opacity duration-1000 ease-in-out ${
                showExplore ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Explore.
            </span>
            <span 
              className={`transition-opacity duration-1000 ease-in-out ${
                showCapture ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Capture.
            </span>
          </h1>
          
          <p className={`text-lg md:text-xl text-gray-500 max-w-2xl text-center mb-4 italic transition-opacity duration-1000 delay-500 ease-in-out relative z-10 ${
            showCapture ? 'opacity-100' : 'opacity-0'
          }`}>
            Bienvenue dans mon univers photographique. Un monde où chaque cliché raconte une histoire, 
            chaque regard figé témoigne d'une émotion, et chaque paysage révèle une nouvelle perspective.
          </p>
        </div>
        
        {/* Flèches positionnées en bas de l'écran */}
        <div className={`flex flex-col items-center mb-8 transition-opacity duration-1000 ease-in-out relative z-10 ${
          showCapture ? 'opacity-70' : 'opacity-0'
        }`}>
          <div className="animate-bounce flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-3">Défiler pour explorer</p>
            
            {/* Les trois petites flèches */}
            <div className="flex space-x-2">
              <svg className="w-4 h-4 text-gray-500 animate-bounce" style={{ animationDelay: '0.1s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <svg className="w-4 h-4 text-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <svg className="w-4 h-4 text-gray-500 animate-bounce" style={{ animationDelay: '0.3s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
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
