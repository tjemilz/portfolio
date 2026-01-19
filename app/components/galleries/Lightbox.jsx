'use client';

import { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';

/**
 * Lightbox component for viewing images in fullscreen
 * with keyboard navigation and touch gestures.
 */
export default function Lightbox({ 
  images, 
  currentIndex, 
  onClose, 
  onPrevious, 
  onNext,
  gallerySlug = '',
  allowDownload = true
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const currentImage = images[currentIndex];

  // Get full resolution image URL
  const getImageUrl = () => {
    if (currentImage.image_url) {
      // Convert relative URLs to absolute for display
      if (currentImage.image_url.startsWith('/media/')) {
        return `${window.location.origin}${currentImage.image_url}`;
      }
      return currentImage.image_url;
    }
    if (currentImage.filename && gallerySlug) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      return `${apiUrl}/api/galleries/${gallerySlug}/images/${currentImage.filename}/`;
    }
    return currentImage.image || currentImage.src || '';
  };

  const imageUrl = getImageUrl();

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        onPrevious();
        break;
      case 'ArrowRight':
        onNext();
        break;
    }
  }, [onClose, onPrevious, onNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Preload adjacent images
  useEffect(() => {
    const preloadImage = (index) => {
      if (index >= 0 && index < images.length) {
        const img = new window.Image();
        let preloadUrl = images[index].image_url;
        
        // Convert relative URLs to absolute
        if (preloadUrl && preloadUrl.startsWith('/media/')) {
          preloadUrl = `${window.location.origin}${preloadUrl}`;
        } else if (!preloadUrl && images[index].filename && gallerySlug) {
          preloadUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/galleries/${gallerySlug}/images/${images[index].filename}/`;
        } else if (!preloadUrl) {
          preloadUrl = images[index].image || images[index].src;
        }
        
        if (preloadUrl) img.src = preloadUrl;
      }
    };

    preloadImage(currentIndex - 1);
    preloadImage(currentIndex + 1);
  }, [currentIndex, images, gallerySlug]);

  // Touch gestures for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrevious();
    }
  };

  // Download handler
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.filename || `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
        aria-label="Fermer"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Download button */}
      {allowDownload && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="absolute top-6 right-20 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
          aria-label="Télécharger"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Previous button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrevious();
        }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 group"
        aria-label="Image précédente"
      >
        <svg className="w-6 h-6 text-white transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 group"
        aria-label="Image suivante"
      >
        <svg className="w-6 h-6 text-white transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Image container */}
      <div 
        className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/10 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}

        {/* Main image */}
        <Image
          src={imageUrl}
          alt={currentImage.title || currentImage.alt || `Image ${currentIndex + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Image counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest font-light">
        {currentIndex + 1} <span className="mx-2">/</span> {images.length}
      </div>

      {/* Image info */}
      {currentImage.title && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-center max-w-lg px-4">
          <h3 className="font-serif text-lg">{currentImage.title}</h3>
          {currentImage.description && (
            <p className="text-white/50 text-sm mt-2 font-light">{currentImage.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
