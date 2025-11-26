"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useBestOfImages } from "./hooks/useBestOfImages";
import { galleriesApi } from "./lib/api";
import dynamic from 'next/dynamic';

// Import dynamique pour éviter les problèmes de SSR avec le canvas
const PointCloudCamera = dynamic(() => import('./components/PointCloudCamera'), {
  ssr: false,
  loading: () => null
});

// Hook pour détecter la visibilité d'un élément
const useReveal = (threshold = 0.1) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
};

// Composant Section avec reveal animation
const RevealSection = ({ children, className = "", delay = 0 }) => {
  const [ref, isVisible] = useReveal(0.1);
  
  return (
    <div
      ref={ref}
      className={`reveal ${isVisible ? 'revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Home() {
  const { images, loading } = useBestOfImages();
  const [galleries, setGalleries] = useState([]);
  const [galleriesLoading, setGalleriesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // États pour contrôler l'animation des titres
  const [showCreate, setShowCreate] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  // Charger les galleries
  useEffect(() => {
    async function fetchGalleries() {
      try {
        const data = await galleriesApi.getPublic();
        const allGalleries = [];
        Object.entries(data).forEach(([type, gals]) => {
          gals.forEach(gallery => {
            if (gallery.slug !== 'bestof') {
              allGalleries.push(gallery);
            }
          });
        });
        allGalleries.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setGalleries(allGalleries.slice(0, 6));
      } catch (error) {
        console.error('Error fetching galleries:', error);
      } finally {
        setGalleriesLoading(false);
      }
    }
    fetchGalleries();
  }, []);

  // Effet pour déclencher les animations séquentiellement
  useEffect(() => {
    const createTimer = setTimeout(() => setShowCreate(true), 400);
    const exploreTimer = setTimeout(() => setShowExplore(true), 1200);
    const captureTimer = setTimeout(() => setShowCapture(true), 2000);
    
    return () => {
      clearTimeout(createTimer);
      clearTimeout(exploreTimer);
      clearTimeout(captureTimer);
    };
  }, []);

  // Auto-rotation du carousel
  useEffect(() => {
    if (images.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [images.length]);

  const openImage = (image) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden';
  };

  const closeImage = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center w-full min-h-screen px-6 py-20 md:py-32 overflow-hidden gradient-bg">
        <PointCloudCamera />
        
        <div className="flex-grow flex flex-col items-center justify-center my-auto relative z-10">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-center mb-12 font-serif flex flex-col items-center">
            <span className={`mb-3 transition-all duration-1000 ease-out ${showCreate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Create.
            </span>
            <span className={`mb-3 text-accent transition-all duration-1000 ease-out ${showExplore ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Explore.
            </span>
            <span className={`transition-all duration-1000 ease-out ${showCapture ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Capture.
            </span>
          </h1>
          
          <p className={`text-lg md:text-xl text-gray-600 max-w-2xl text-center mb-8 font-light leading-relaxed transition-all duration-1000 delay-500 ease-out ${showCapture ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Bienvenue dans mon univers photographique. Un monde où chaque cliché raconte une histoire, 
            chaque regard figé témoigne d'une émotion, et chaque paysage révèle une nouvelle perspective.
          </p>

          <Link 
            href="/galleries"
            className={`group inline-flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-gray-900 text-gray-900 font-medium rounded-full hover:bg-gray-900 hover:text-white transition-all duration-300 ${showCapture ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '600ms' }}
          >
            Explorer les galeries
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
        
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ${showCapture ? 'opacity-60' : 'opacity-0'}`}>
          <span className="text-sm text-gray-500 mb-3 font-light tracking-wider uppercase">Défiler</span>
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Featured Images Section */}
      <section className="w-full py-24 md:py-32 px-6 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <span className="text-accent uppercase tracking-[0.3em] text-sm font-medium">Portfolio</span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mt-4 mb-6">Sélection de photos</h2>
              <div className="w-24 h-0.5 bg-accent mx-auto" />
            </div>
          </RevealSection>
          
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <RevealSection delay={200}>
              <div className="relative">
                <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-lg shadow-2xl">
                  {images.map((image, index) => (
                    <div
                      key={image.id || index}
                      className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <Image
                        src={image.image_url || image.thumbnail_url}
                        alt={image.alt_text || image.title || 'Photo portfolio'}
                        fill
                        sizes="100vw"
                        className="object-cover cursor-pointer"
                        onClick={() => openImage(image)}
                        priority={index === 0}
                      />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  {images.slice(0, 7).map((image, index) => (
                    <button
                      key={image.id || index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex ? 'ring-2 ring-accent ring-offset-2 scale-105' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={image.thumbnail_url || image.image_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </RevealSection>
          )}
        </div>
      </section>

      {/* Galleries Preview Section */}
      <section className="w-full py-24 md:py-32 px-6 md:px-10 bg-cream">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <span className="text-accent uppercase tracking-[0.3em] text-sm font-medium">Collections</span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mt-4 mb-6">Mes galeries</h2>
              <div className="w-24 h-0.5 bg-accent mx-auto" />
            </div>
          </RevealSection>

          {galleriesLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {galleries.map((gallery, index) => (
                <RevealSection key={gallery.id || gallery.slug} delay={index * 100}>
                  <Link href={`/gallery/${gallery.slug}`} className="group block">
                    <div className="image-hover rounded-xl overflow-hidden shadow-lg bg-white">
                      <div className="aspect-[4/3] relative">
                        {gallery.cover_url ? (
                          <Image src={gallery.cover_url} alt={gallery.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="overlay" />
                        <div className="overlay-content text-white">
                          <span className="text-sm font-light opacity-80">{gallery.image_count || 0} photos</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-xl font-serif font-semibold group-hover:text-accent transition-colors">{gallery.name}</h3>
                        {gallery.description && <p className="text-gray-500 text-sm mt-2 line-clamp-2">{gallery.description}</p>}
                      </div>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>
          )}

          <RevealSection delay={600}>
            <div className="text-center mt-12">
              <Link href="/galleries" className="inline-flex items-center gap-2 text-accent hover:opacity-80 font-medium transition-opacity">
                Voir toutes les galeries
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Quote Section */}
      <section className="w-full py-24 md:py-32 px-6 md:px-10 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </div>
        
        <RevealSection>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <svg className="w-12 h-12 text-accent mx-auto mb-8 opacity-60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="text-2xl md:text-4xl font-serif font-light italic leading-relaxed mb-8">
              La photographie est l'art de capturer l'âme d'un instant qui ne reviendra jamais.
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-0.5 bg-accent" />
              <p className="text-gray-400 font-light">Une vision personnelle</p>
              <div className="w-12 h-0.5 bg-accent" />
            </div>
          </div>
        </RevealSection>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 md:py-32 px-6 md:px-10 bg-cream">
        <RevealSection>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Envie d'en découvrir plus ?</h2>
            <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
              Parcourez mes différentes galeries et plongez dans mon univers photographique. Chaque collection raconte une histoire unique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/galleries" className="px-8 py-4 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 transition-colors">
                Parcourir les galeries
              </Link>
              <Link href="/bio" className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium rounded-full hover:bg-gray-900 hover:text-white transition-colors">
                En savoir plus sur moi
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeImage}>
          <button className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors z-10" onClick={closeImage}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.image_url || selectedImage.thumbnail_url}
              alt={selectedImage.alt_text || selectedImage.title || "Photo agrandie"}
              width={1600}
              height={1200}
              className="max-h-[85vh] w-auto object-contain rounded-lg"
            />
            {selectedImage.title && <p className="text-white/80 text-center mt-4 font-light">{selectedImage.title}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
