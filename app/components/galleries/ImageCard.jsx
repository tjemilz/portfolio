'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * ImageCard component displays a single image with hover effects,
 * optional metadata display, and selection support.
 */
export default function ImageCard({ 
  image, 
  onClick, 
  gallerySlug = '',
  priority = false,
  showMetadata = false,
  allowDownload = true,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get full resolution image URL for lightbox/download
  const getFullImageUrl = () => {
    if (image.image_url) {
      // If it's a relative URL starting with /media/, make it absolute
      if (image.image_url.startsWith('/media/')) {
        return `${window.location.origin}${image.image_url}`;
      }
      return image.image_url;
    }
    if (image.filename && gallerySlug) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      return `${apiUrl}/api/galleries/${gallerySlug}/images/${image.filename}/`;
    }
    return image.image || image.src || '';
  };

  // Build image URL - support both API served images and direct paths
  const getImageUrl = () => {
    // Use thumbnail for gallery grid display
    if (image.thumbnail_url) {
      // If it's a relative URL starting with /media/, make it absolute for Next.js Image
      if (image.thumbnail_url.startsWith('/media/')) {
        return `${window.location.origin}${image.thumbnail_url}`;
      }
      return image.thumbnail_url;
    }
    if (image.thumbnail) {
      if (image.thumbnail.startsWith('/media/')) {
        return `${window.location.origin}${image.thumbnail}`;
      }
      return image.thumbnail;
    }
    if (image.filename && gallerySlug) {
      // Use API endpoint for secure image serving (fallback)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      return `${apiUrl}/api/galleries/${gallerySlug}/thumbnails/${image.filename}/`;
    }
    // Fallback to full image
    return getFullImageUrl();
  };

  // Download handler
  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(getFullImageUrl());
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename || image.title || `image.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const imageUrl = getImageUrl();
  const altText = image.title || image.alt || image.filename || 'Image de la galerie';

  if (hasError) {
    return (
      <div className="relative aspect-[3/4] bg-slate-grey/10 rounded-sm flex items-center justify-center">
        <div className="text-center text-slate-grey p-4">
          <svg 
            className="w-12 h-12 mx-auto mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <p className="text-sm font-light">Image non disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        group relative aspect-[3/4] overflow-hidden rounded-sm cursor-pointer bg-slate-grey/10
        ${isSelectionMode ? 'ring-2 ring-offset-2 transition-all' : ''}
        ${isSelected ? 'ring-accent' : 'ring-transparent'}
      `}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div 
          className="absolute top-3 left-3 z-20"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
            ${isSelected 
              ? 'bg-accent border-accent' 
              : 'bg-white/90 border-slate-grey/50 hover:border-accent'
            }
          `}>
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Image */}
      <Image
        src={imageUrl}
        alt={altText}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`
          object-cover image-hover
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500" />

      {/* Metadata overlay (optional) */}
      {showMetadata && image.title && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-white text-sm font-medium truncate">
            {image.title}
          </h3>
          {image.camera_model && (
            <p className="text-white/60 text-xs mt-1 font-light">
              {image.camera_model}
            </p>
          )}
        </div>
      )}

      {/* Actions on hover */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex gap-2">
        {/* Download button */}
        {allowDownload && (
          <button
            onClick={handleDownload}
            className="bg-white/95 rounded-full p-2.5 shadow-lg hover:bg-white transition-colors"
            title="Télécharger"
          >
            <svg 
              className="w-4 h-4 text-space-indigo" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
              />
            </svg>
          </button>
        )}
        {/* Expand button */}
        <div className="bg-white/95 rounded-full p-2.5 shadow-lg">
          <svg 
            className="w-4 h-4 text-space-indigo" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
