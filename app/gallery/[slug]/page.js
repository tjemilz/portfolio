"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useGallery, useGalleryImages } from '../../hooks/useGalleries';
import { GalleryGrid, GalleryGridSkeleton } from '../../components/galleries';

export default function GalleryPage() {
  const params = useParams();
  const slug = params.slug;
  
  // Fetch gallery details and images
  const { gallery, loading: galleryLoading, error: galleryError } = useGallery(slug);
  const { images, loading: imagesLoading, error: imagesError } = useGalleryImages(slug);

  const loading = galleryLoading || imagesLoading;
  const error = galleryError || imagesError;

  // Show loading skeleton
  if (loading && !gallery) {
    return (
      <div className="min-h-screen bg-background">
        <section className="pt-32 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse text-center">
              <div className="h-4 w-24 bg-slate-grey/20 rounded mx-auto mb-6"></div>
              <div className="h-16 w-80 bg-slate-grey/20 rounded mx-auto mb-8"></div>
              <div className="h-6 w-2/3 bg-slate-grey/20 rounded mx-auto"></div>
            </div>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-grey/30 to-transparent"></div>
        </div>
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <GalleryGridSkeleton count={6} />
          </div>
        </section>
      </div>
    );
  }

  // Handle gallery not found
  if (error && error.includes('not found')) {
    notFound();
  }

  // Handle other errors
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-space-indigo mb-3">Une erreur est survenue</h1>
          <p className="text-slate-grey mb-8">{error}</p>
          <Link
            href="/galleries"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-space-indigo text-white rounded-full text-sm hover:bg-shadow-grey transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour aux galeries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <Link 
                href="/galleries" 
                className="inline-flex items-center gap-2 text-accent text-sm tracking-[0.2em] uppercase font-medium hover:text-accent-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Galeries
              </Link>
            </nav>
            
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-space-indigo">
              {gallery?.name || slug}
            </h1>
            
            {gallery?.description && (
              <p className="mt-6 text-lg md:text-xl text-slate-grey max-w-3xl mx-auto font-light leading-relaxed italic">
                "{gallery.description}"
              </p>
            )}
            
            {/* Métadonnées */}
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-grey">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {images?.length || 0} photos
              </span>
              {gallery?.visibility === 'PRIVATE' && (
                <span className="flex items-center gap-2 text-accent">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Collection privée
                </span>
              )}
              {gallery?.allow_download && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Téléchargement autorisé
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ligne décorative */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-grey/30 to-transparent"></div>
      </div>

      {/* Galerie d'images */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {images && images.length > 0 ? (
            <GalleryGrid 
              images={images} 
              loading={imagesLoading} 
              gallerySlug={slug}
              showLightbox={true}
              allowDownload={gallery?.allow_download !== false}
            />
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-slate-grey/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-space-indigo mb-3">
                Cette galerie est vide
              </h3>
              <p className="text-slate-grey mb-8">
                Aucune photo n'a encore été ajoutée à cette collection.
              </p>
              <Link
                href="/galleries"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-space-indigo text-white rounded-full text-sm hover:bg-shadow-grey transition-colors"
              >
                Voir d'autres galeries
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Navigation vers autres galeries */}
      <section className="py-16 px-6 border-t border-slate-grey/20">
        <div className="max-w-7xl mx-auto text-center">
          <Link
            href="/galleries"
            className="inline-flex items-center gap-3 text-slate-grey hover:text-accent transition-colors group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Voir toutes les galeries</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
