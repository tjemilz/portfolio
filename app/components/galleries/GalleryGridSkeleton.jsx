'use client';

/**
 * GalleryGridSkeleton component displays loading placeholders
 * while the gallery images are being fetched.
 */
export default function GalleryGridSkeleton({ 
  count = 9, 
  columns = { sm: 1, md: 2, lg: 3 } 
}) {
  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative aspect-[3/4] bg-slate-grey/10 rounded-sm overflow-hidden"
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
