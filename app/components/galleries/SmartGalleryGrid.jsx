'use client';

import GalleryGrid from './GalleryGrid';
import VirtualizedGalleryGrid from './VirtualizedGalleryGrid';

/**
 * SmartGalleryGrid - Automatically chooses between regular and virtualized grid
 * based on the number of images for optimal performance
 */
export default function SmartGalleryGrid({ 
  images = [], 
  loading = false,
  virtualizationThreshold = 50,
  useVirtualization = 'auto', // 'auto', 'always', 'never'
  ...props 
}) {
  // Determine if we should use virtualization
  const shouldVirtualize = () => {
    if (useVirtualization === 'always') return true;
    if (useVirtualization === 'never') return false;
    // Auto mode: virtualize for large galleries
    return images.length >= virtualizationThreshold;
  };

  if (shouldVirtualize() && !loading && images.length > 0) {
    return (
      <VirtualizedGalleryGrid 
        images={images} 
        loading={loading}
        threshold={virtualizationThreshold}
        {...props} 
      />
    );
  }

  return (
    <GalleryGrid 
      images={images} 
      loading={loading}
      {...props} 
    />
  );
}
