'use client';

import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ImageCard from './ImageCard';
import Lightbox from './Lightbox';
import GalleryGridSkeleton from './GalleryGridSkeleton';

/**
 * VirtualizedGalleryGrid - Optimized grid for large image galleries
 * Uses react-virtuoso for virtual scrolling to improve performance
 */
export default function VirtualizedGalleryGrid({ 
  images = [], 
  loading = false,
  showLightbox = true,
  gallerySlug = '',
  threshold = 30 // Use virtualization for galleries with more than 30 images
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = (index) => {
    if (showLightbox) {
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

  if (loading) {
    return <GalleryGridSkeleton />;
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

  // Use regular grid for small galleries
  if (images.length < threshold) {
    return (
      <>
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <ImageCard
              key={image.id || index}
              image={image}
              onClick={() => openLightbox(index)}
              gallerySlug={gallerySlug}
              priority={index < 6}
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

  // Organize images into rows of 3 (responsive grid simulation)
  const itemsPerRow = 3;
  const rows = [];
  for (let i = 0; i < images.length; i += itemsPerRow) {
    rows.push(images.slice(i, i + itemsPerRow));
  }

  // Row renderer for react-virtuoso
  const renderRow = (index) => {
    const rowImages = rows[index];
    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4 md:mb-6">
        {rowImages.map((image, imgIndex) => {
          const absoluteIndex = index * itemsPerRow + imgIndex;
          return (
            <ImageCard
              key={image.id || absoluteIndex}
              image={image}
              onClick={() => openLightbox(absoluteIndex)}
              gallerySlug={gallerySlug}
              priority={false}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Virtuoso
        style={{ height: '80vh' }}
        totalCount={rows.length}
        itemContent={renderRow}
        overscan={200}
      />

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
