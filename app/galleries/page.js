"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../providers/AuthProvider';
import { galleriesApi } from '../lib/api';

// Composant pour les galeries
function GalleryCard({ gallery, index }) {
  return (
    <Link 
      href={`/gallery/${gallery.slug}`}
      className={`group block ${index % 3 === 1 ? 'md:mt-12' : ''}`}
    >
      <div className="relative overflow-hidden rounded-sm">
        {/* Image de couverture */}
        <div className={`relative ${index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[3/4]'} bg-slate-grey/10 overflow-hidden`}>
          {gallery.cover_url ? (
            (gallery.cover_url.startsWith('/media/') || gallery.cover_url.includes('/media/')) ? (
              <img
                src={gallery.cover_url}
                alt={gallery.name}
                className="absolute inset-0 w-full h-full object-cover image-hover"
                loading="lazy"
              />
            ) : (
              <Image
                src={gallery.cover_url}
                alt={gallery.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover image-hover"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Badge de visibilité */}
          {gallery.visibility === 'PRIVATE' && (
            <div className="absolute top-4 left-4 bg-accent text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Privée
            </div>
          )}
          
          {/* Overlay au hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
              <span className="bg-white text-space-indigo px-6 py-2.5 rounded-full text-sm font-medium">
                Découvrir
              </span>
            </div>
          </div>
        </div>

        {/* Infos de la galerie */}
        <div className="pt-5 pb-2">
          <h3 className="font-serif text-xl text-space-indigo group-hover:text-accent transition-colors duration-300">
            {gallery.name}
          </h3>
          {gallery.description && (
            <p className="mt-1.5 text-slate-grey text-sm line-clamp-2 font-light">
              {gallery.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-grey">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {gallery.image_count || 0} photos
            </span>
            {gallery.gallery_type && gallery.gallery_type !== 'OTHER' && (
              <span className="text-accent">{gallery.gallery_type}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GalleriesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getAll();
      const allGalleries = data.results || data;
      const filteredGalleries = allGalleries.filter(g => g.slug !== 'bestof');
      setGalleries(filteredGalleries);
    } catch (err) {
      console.error('Error fetching galleries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchGalleries();
    }
  }, [authLoading, fetchGalleries]);

  const filteredGalleries = galleries.filter(gallery => {
    if (filter === 'all') return true;
    if (filter === 'public') return gallery.visibility === 'PUBLIC';
    if (filter === 'private') return gallery.visibility === 'PRIVATE';
    return true;
  });

  const publicCount = galleries.filter(g => g.visibility === 'PUBLIC').length;
  const privateCount = galleries.filter(g => g.visibility === 'PRIVATE').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <span className="text-accent text-sm tracking-[0.3em] uppercase font-medium">
              Collections
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-7xl lg:text-8xl text-space-indigo">
              Galeries
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-grey max-w-2xl mx-auto font-light leading-relaxed">
              {isAuthenticated 
                ? `Bienvenue ${user?.first_name || user?.username || 'visiteur'}. Explorez vos galeries exclusives.`
                : `Découvrez mes collections photographiques à travers différentes séries thématiques.`
              }
            </p>
          </div>

          {/* Filtres */}
          {isAuthenticated && privateCount > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-12">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === 'all'
                    ? 'bg-space-indigo text-white'
                    : 'bg-white text-slate-grey hover:bg-slate-grey/10 border border-slate-grey/20'
                }`}
              >
                Toutes ({galleries.length})
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === 'public'
                    ? 'bg-space-indigo text-white'
                    : 'bg-white text-slate-grey hover:bg-slate-grey/10 border border-slate-grey/20'
                }`}
              >
                Publiques ({publicCount})
              </button>
              <button
                onClick={() => setFilter('private')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === 'private'
                    ? 'bg-accent text-white'
                    : 'bg-white text-slate-grey hover:bg-slate-grey/10 border border-slate-grey/20'
                }`}
              >
                Privées ({privateCount})
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Ligne décorative */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-grey/30 to-transparent"></div>
      </div>

      {/* Grille de galeries */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* État de chargement */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`animate-pulse ${i % 3 === 1 ? 'md:mt-12' : ''}`}>
                  <div className={`${i % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[3/4]'} bg-gray-200 rounded-sm`}></div>
                  <div className="mt-5 h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="mt-2 h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="text-center py-16">
              <div className="inline-block p-8 bg-white rounded-lg shadow-sm border border-red-100">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-space-indigo font-medium">Une erreur est survenue</p>
                <p className="text-slate-grey text-sm mt-1">{error}</p>
                <button 
                  onClick={fetchGalleries}
                  className="mt-6 px-6 py-2.5 bg-space-indigo text-white rounded-full text-sm hover:bg-shadow-grey transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Galeries */}
          {!loading && !error && filteredGalleries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filteredGalleries.map((gallery, index) => (
                <GalleryCard key={gallery.id} gallery={gallery} index={index} />
              ))}
            </div>
          )}

          {/* Aucune galerie */}
          {!loading && !error && filteredGalleries.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-slate-grey/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl text-space-indigo mb-3">
                Aucune galerie disponible
              </h3>
              <p className="text-slate-grey mb-8 max-w-md mx-auto">
                {filter !== 'all' 
                  ? 'Aucune galerie ne correspond à ce filtre.'
                  : 'Il n\'y a pas encore de galeries à afficher.'
                }
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="px-8 py-3 bg-space-indigo text-white rounded-full text-sm hover:bg-shadow-grey transition-colors"
                >
                  Voir toutes les galeries
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA pour connexion si non authentifié */}
      {!loading && !isAuthenticated && (
        <section className="py-24 px-6 bg-space-indigo text-white">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-accent text-sm tracking-[0.3em] uppercase">Accès exclusif</span>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl text-white">
              Découvrez les galeries privées
            </h2>
            <p className="mt-4 text-slate-grey max-w-xl mx-auto">
              Connectez-vous pour accéder aux collections exclusives réservées à certains membres.
            </p>
            <Link
              href="/login?redirect=/galleries"
              className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-accent text-white rounded-full hover:bg-accent-hover transition-colors"
            >
              Se connecter
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
