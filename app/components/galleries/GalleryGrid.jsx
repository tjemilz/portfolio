'use client';

import { useState } from 'react';
import ImageCard from './ImageCard';
import Lightbox from './Lightbox';
import GalleryGridSkeleton from './GalleryGridSkeleton';
import { imagesApi } from '../../lib/api';

/**
 * GalleryGrid component displays a responsive grid of images
 * with optional lazy loading, lightbox functionality, and multi-select download.
 */
export default function GalleryGrid({ 
  images = [], 
  loading = false, 
  columns = { sm: 1, md: 2, lg: 3 },
  showLightbox = true,
  gallerySlug = '',
  allowMultiSelect = true
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const openLightbox = (index) => {
    if (showLightbox && !isSelectionMode) {
      setSelectedIndex(index);
      setLightboxOpen(true);
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedImages(new Set());
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imageId) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  // Select/Deselect all images
  const toggleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  // Download selected images
  const handleDownloadSelected = async () => {
    if (selectedImages.size === 0) return;
    
    setIsDownloading(true);
    try {
      const blob = await imagesApi.downloadMultiple(Array.from(selectedImages));
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gallerySlug || 'images'}_selection.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Reset selection
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Erreur lors du téléchargement. Veuillez réessayer.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <GalleryGridSkeleton columns={columns} />;
  }

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-grey dark:text-slate-grey/80">
          Aucune image dans cette galerie
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Selection toolbar */}
      {allowMultiSelect && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-grey/20">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectionMode}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isSelectionMode 
                  ? 'bg-accent text-white' 
                  : 'bg-slate-grey/10 text-slate-grey hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isSelectionMode ? 'Annuler la sélection' : 'Sélectionner'}
            </button>
            
            {isSelectionMode && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  {selectedImages.size === images.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
                <span className="text-sm text-slate-grey">
                  {selectedImages.size} image{selectedImages.size > 1 ? 's' : ''} sélectionnée{selectedImages.size > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          
          {isSelectionMode && selectedImages.size > 0 && (
            <button
              onClick={handleDownloadSelected}
              disabled={isDownloading}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
                ${isDownloading 
                  ? 'bg-gray-300 text-slate-grey cursor-not-allowed' 
                  : 'bg-accent text-white hover:bg-accent-hover'
                }
              `}
            >
              {isDownloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Téléchargement...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger ({selectedImages.size})
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Image grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <ImageCard
            key={image.id || index}
            image={image}
            onClick={() => isSelectionMode ? toggleImageSelection(image.id) : openLightbox(index)}
            gallerySlug={gallerySlug}
            priority={index < 6}
            isSelectionMode={isSelectionMode}
            isSelected={selectedImages.has(image.id)}
            onToggleSelect={() => toggleImageSelection(image.id)}
          />
        ))}
      </div>

      {showLightbox && lightboxOpen && selectedIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={selectedIndex}
          onClose={closeLightbox}
          onPrevious={goToPrevious}
          onNext={goToNext}
          gallerySlug={gallerySlug}
        />
      )}
    </>
  );
}
