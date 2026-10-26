"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../AdminLayout';
import { buildApiUrl } from '@/app/lib/apiUtils';

const GalleriesManagementPage = () => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, gallery: null });

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/galleries/'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des galeries');
      }

      const data = await response.json();
      setGalleries(data.results || data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (gallery) => {
    try {
      const response = await fetch(buildApiUrl(`/api/galleries/${gallery.slug}/`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setGalleries(galleries.filter(g => g.id !== gallery.id));
      setDeleteModal({ open: false, gallery: null });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression de la galerie');
    }
  };

  const handleToggleFeatured = async (gallery) => {
    try {
      const response = await fetch(buildApiUrl(`/api/galleries/${gallery.slug}/toggle_featured/`), {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setGalleries(prev => prev.map(g => g.id === gallery.id ? { ...g, is_featured: data.is_featured } : g));
    } catch (err) {
      console.error(err);
      alert('Impossible de modifier la mise en avant');
    }
  };

  const handleToggleNavbar = async (gallery) => {
    try {
      const response = await fetch(buildApiUrl(`/api/galleries/${gallery.slug}/toggle_navbar/`), {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setGalleries(prev => prev.map(g => g.id === gallery.id ? { ...g, show_in_navbar: data.show_in_navbar } : g));
    } catch (err) {
      console.error(err);
      alert('Impossible de modifier l\'affichage dans la barre supérieure');
    }
  };

  const filteredGalleries = galleries.filter(gallery => {
    const matchesSearch = (gallery.name || gallery.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (gallery.slug || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterVisibility === 'featured') {
      matchesFilter = gallery.is_featured === true;
    } else if (filterVisibility === 'navbar') {
      matchesFilter = gallery.show_in_navbar !== false;
    } else if (filterVisibility !== 'all') {
      matchesFilter = gallery.visibility === filterVisibility;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-space-indigo">Gestion des galeries</h1>
          <p className="text-slate-grey mt-1">{galleries.length} galeries au total</p>
        </div>
        <Link
          href="/admin/galleries/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle galerie
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher une galerie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">Toutes les galeries</option>
            <option value="featured">⭐ Mises en avant (Accueil)</option>
            <option value="navbar">🧭 Dans la barre supérieure</option>
            <option value="PUBLIC">Publiques</option>
            <option value="PRIVATE">Privées</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-grey mt-4">Chargement des galeries...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Galleries Display */}
      {!loading && !error && (
        <div className="space-y-4">
          {/* Mobile Cards (Phones & Small screens) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredGalleries.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-slate-grey">
                Aucune galerie trouvée
              </div>
            ) : (
              filteredGalleries.map((gallery) => (
                <div key={gallery.id || gallery.slug} className="bg-white rounded-xl shadow p-4 border border-slate-grey/10">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {gallery.cover_url || gallery.cover_image ? (
                        <img
                          src={gallery.cover_url || gallery.cover_image}
                          alt={gallery.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-grey">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-space-indigo truncate">{gallery.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          gallery.visibility === 'PUBLIC' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {gallery.visibility === 'PUBLIC' ? 'Publique' : 'Privée'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-grey font-mono mt-0.5">/{gallery.slug}</p>
                      <p className="text-xs text-slate-grey mt-1">{gallery.image_count || 0} photos • {gallery.gallery_type || 'Standard'}</p>
                    </div>
                  </div>

                  {/* Mobile Toggles */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs">
                    <button
                      onClick={() => handleToggleFeatured(gallery)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                        gallery.is_featured
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{gallery.is_featured ? '⭐ En avant' : '☆ Pas en avant'}</span>
                    </button>

                    <button
                      onClick={() => handleToggleNavbar(gallery)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                        gallery.show_in_navbar !== false
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{gallery.show_in_navbar !== false ? '🧭 Menu sup.' : 'Caché du menu'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/galleries/${gallery.slug}/edit`}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Modifier"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <Link
                        href={`/admin/galleries/${gallery.slug}/images`}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Images"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ open: true, gallery })}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (Tablet / Desktop) */}
          <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-grey/5 border-b border-slate-grey/20">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Galerie
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Visibilité
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      En avant (Accueil)
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Barre supérieure
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Photos
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGalleries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-grey">
                        Aucune galerie trouvée
                      </td>
                    </tr>
                  ) : (
                    filteredGalleries.map((gallery) => (
                      <tr key={gallery.id || gallery.slug} className="hover:bg-slate-grey/5">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {gallery.cover_url || gallery.cover_image ? (
                                <img
                                  src={gallery.cover_url || gallery.cover_image}
                                  alt={gallery.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-slate-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-space-indigo">{gallery.name}</p>
                              <p className="text-xs text-slate-grey font-mono">{gallery.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-grey">
                            {gallery.gallery_type || 'Standard'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            gallery.visibility === 'PUBLIC' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {gallery.visibility === 'PUBLIC' ? 'Publique' : 'Privée'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleFeatured(gallery)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              gallery.is_featured
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Cliquer pour basculer"
                          >
                            <span>{gallery.is_featured ? '⭐ Oui' : '— Non'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleNavbar(gallery)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              gallery.show_in_navbar !== false
                                ? 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Cliquer pour basculer"
                          >
                            <span>{gallery.show_in_navbar !== false ? '🧭 Visible' : '— Masqué'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-slate-grey font-medium">
                            {gallery.image_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/galleries/${gallery.slug}/edit`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <Link
                              href={`/admin/galleries/${gallery.slug}/images`}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Gérer les images"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => setDeleteModal({ open: true, gallery })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-space-indigo mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-slate-grey mb-6">
              Êtes-vous sûr de vouloir supprimer la galerie "{deleteModal.gallery?.name}" ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ open: false, gallery: null })}
                className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteModal.gallery)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default GalleriesManagementPage;

