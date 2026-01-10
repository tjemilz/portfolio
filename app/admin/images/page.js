"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../AdminLayout';
import { buildApiUrl } from '@/app/lib/apiUtils';

const ImagesManagementPage = () => {
  const [images, setImages] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGallery, setFilterGallery] = useState('all');
  const [selectedImages, setSelectedImages] = useState([]);
  
  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, image: null });
  const [uploadModal, setUploadModal] = useState({ open: false });
  const [editModal, setEditModal] = useState({ open: false, image: null });
  const [bulkGalleryModal, setBulkGalleryModal] = useState({ open: false, action: 'add' });

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all galleries (no pagination)
      const galleriesRes = await fetch(buildApiUrl('/api/galleries/?page_size=all'), { headers });
      const galleriesData = await galleriesRes.json();
      const galleriesList = galleriesData.results || galleriesData;
      setGalleries(galleriesList);

      // Fetch all images (no pagination)
      const imagesRes = await fetch(buildApiUrl('/api/galleries/images/?page_size=all'), { headers });
      const imagesData = await imagesRes.json();
      setImages(imagesData.results || imagesData);
      
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Single image delete
  const handleDelete = async (image) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/api/galleries/images/${image.id}/`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setImages(images.filter(i => i.id !== image.id));
      setDeleteModal({ open: false, image: null });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression de l\'image');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedImages.length} images ?`)) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl('/api/galleries/images/bulk_delete/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_ids: selectedImages }),
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setImages(images.filter(i => !selectedImages.includes(i.id)));
      setSelectedImages([]);
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression des images');
    }
  };

  // Update single image galleries
  const handleUpdateGalleries = async (imageId, galleryIds) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/api/galleries/images/${imageId}/update_galleries/`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gallery_ids: galleryIds }),
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      const data = await response.json();
      setImages(images.map(img => 
        img.id === imageId ? { ...img, galleries: data.galleries } : img
      ));
      setEditModal({ open: false, image: null });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour des galeries');
    }
  };

  // Bulk update galleries
  const handleBulkUpdateGalleries = async (galleryIds, action) => {
    try {
      const token = localStorage.getItem('access_token');
      const body = { image_ids: selectedImages };
      
      if (action === 'set') body.set_galleries = galleryIds;
      else if (action === 'add') body.add_galleries = galleryIds;
      else if (action === 'remove') body.remove_galleries = galleryIds;
      
      const response = await fetch(buildApiUrl('/api/galleries/images/bulk_update_galleries/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      await fetchData();
      setSelectedImages([]);
      setBulkGalleryModal({ open: false, action: 'add' });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour des galeries');
    }
  };

  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(i => i.id));
    }
  };

  // Filter images
  const filteredImages = images.filter(image => {
    const matchesSearch = 
      (image.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (image.alt_text?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterGallery === 'all') return matchesSearch;
    if (filterGallery === 'no-gallery') {
      return matchesSearch && (!image.galleries || image.galleries.length === 0);
    }
    return matchesSearch && image.galleries?.some(g => g.slug === filterGallery);
  });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-space-indigo">Gestion des images</h1>
          <p className="text-slate-grey mt-1">{images.length} images au total</p>
        </div>
        <button
          onClick={() => setUploadModal({ open: true })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Ajouter des images
        </button>
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
                placeholder="Rechercher une image..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filterGallery}
            onChange={(e) => setFilterGallery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toutes les galeries</option>
            <option value="no-gallery">Sans galerie</option>
            {galleries.map(g => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedImages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-blue-700 font-medium">
            {selectedImages.length} image(s) sélectionnée(s)
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedImages([])}
              className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
            >
              Désélectionner
            </button>
            <button
              onClick={() => setBulkGalleryModal({ open: true, action: 'add' })}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              + Galeries
            </button>
            <button
              onClick={() => setBulkGalleryModal({ open: true, action: 'remove' })}
              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              - Galeries
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-grey mt-4">Chargement des images...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
      )}

      {/* Images Grid */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow p-6">
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-grey">Aucune image trouvée</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <input
                  type="checkbox"
                  checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-grey">Tout sélectionner ({filteredImages.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <div 
                    key={image.id}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImages.includes(image.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-grey/20 hover:border-gray-300'
                    }`}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 bg-white shadow"
                      />
                    </div>

                    <div className="aspect-square bg-slate-grey/10">
                      <img
                        src={image.thumbnail_url || image.image_url}
                        alt={image.alt_text || image.title || 'Image'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => window.open(image.image_url, '_blank')}
                        className="p-2 bg-white rounded-full text-shadow-grey hover:bg-slate-grey/10"
                        title="Voir"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditModal({ open: true, image })}
                        className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600"
                        title="Modifier"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, image })}
                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex flex-wrap gap-1">
                        {image.galleries && image.galleries.length > 0 ? (
                          image.galleries.slice(0, 2).map(g => (
                            <span key={g.id} className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded">
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/50 text-white rounded">
                            Aucune galerie
                          </span>
                        )}
                        {image.galleries && image.galleries.length > 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded">
                            +{image.galleries.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-space-indigo mb-2">Confirmer la suppression</h3>
            <p className="text-slate-grey mb-4">Cette action est irréversible.</p>
            {deleteModal.image && (
              <div className="mb-4 p-2 bg-slate-grey/10 rounded-lg">
                <img src={deleteModal.image.thumbnail_url || deleteModal.image.image_url} alt="" className="w-full h-32 object-cover rounded" />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModal({ open: false, image: null })} className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200">Annuler</button>
              <button onClick={() => handleDelete(deleteModal.image)} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Galleries Modal */}
      <EditGalleriesModal
        open={editModal.open}
        image={editModal.image}
        galleries={galleries}
        onClose={() => setEditModal({ open: false, image: null })}
        onSave={handleUpdateGalleries}
      />

      {/* Bulk Gallery Modal */}
      <BulkGalleryModal
        open={bulkGalleryModal.open}
        action={bulkGalleryModal.action}
        galleries={galleries}
        selectedCount={selectedImages.length}
        onClose={() => setBulkGalleryModal({ open: false, action: 'add' })}
        onSave={handleBulkUpdateGalleries}
      />

      {/* Upload Modal */}
      <UploadModal
        open={uploadModal.open}
        galleries={galleries}
        onClose={() => setUploadModal({ open: false })}
        onUploadComplete={() => { fetchData(); setUploadModal({ open: false }); }}
      />
    </AdminLayout>
  );
};

// Edit Galleries Modal
const EditGalleriesModal = ({ open, image, galleries, onClose, onSave }) => {
  const [selectedGalleryIds, setSelectedGalleryIds] = useState([]);

  useEffect(() => {
    if (image?.galleries) {
      setSelectedGalleryIds(image.galleries.map(g => g.id));
    }
  }, [image]);

  const toggleGallery = (id) => {
    setSelectedGalleryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-space-indigo">Modifier les galeries</h3>
          <button onClick={onClose} className="text-slate-grey hover:text-slate-grey">✕</button>
        </div>

        <div className="mb-4 p-2 bg-slate-grey/10 rounded-lg">
          <img src={image.thumbnail_url || image.image_url} alt="" className="w-full h-40 object-cover rounded" />
        </div>

        <p className="text-sm text-slate-grey mb-3">Sélectionnez les galeries :</p>
        <div className="space-y-2 max-h-60 overflow-auto">
          {galleries.map(gallery => (
            <label key={gallery.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedGalleryIds.includes(gallery.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-grey/20 hover:border-gray-300'}`}>
              <input type="checkbox" checked={selectedGalleryIds.includes(gallery.id)} onChange={() => toggleGallery(gallery.id)} className="w-4 h-4 text-blue-600 rounded" />
              <div>
                <p className="font-medium text-space-indigo">{gallery.name}</p>
                <p className="text-xs text-slate-grey">{gallery.visibility} • {gallery.image_count || 0} images</p>
              </div>
            </label>
          ))}
        </div>

        {selectedGalleryIds.length === 0 && <p className="text-sm text-orange-600 mt-2">⚠️ Aucune galerie sélectionnée</p>}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200">Annuler</button>
          <button onClick={() => onSave(image.id, selectedGalleryIds)} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

// Bulk Gallery Modal
const BulkGalleryModal = ({ open, action, galleries, selectedCount, onClose, onSave }) => {
  const [selectedGalleryIds, setSelectedGalleryIds] = useState([]);

  const toggleGallery = (id) => {
    setSelectedGalleryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (selectedGalleryIds.length === 0) { alert('Sélectionnez au moins une galerie'); return; }
    onSave(selectedGalleryIds, action);
    setSelectedGalleryIds([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-space-indigo">{action === 'add' ? 'Ajouter à' : 'Retirer de'} des galeries</h3>
          <button onClick={onClose} className="text-slate-grey hover:text-slate-grey">✕</button>
        </div>

        <p className="text-sm text-slate-grey mb-4">{selectedCount} image(s) sélectionnée(s)</p>

        <div className="space-y-2 max-h-60 overflow-auto">
          {galleries.map(gallery => (
            <label key={gallery.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedGalleryIds.includes(gallery.id) ? (action === 'add' ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50') : 'border-slate-grey/20 hover:border-gray-300'}`}>
              <input type="checkbox" checked={selectedGalleryIds.includes(gallery.id)} onChange={() => toggleGallery(gallery.id)} className="w-4 h-4 rounded" />
              <div>
                <p className="font-medium text-space-indigo">{gallery.name}</p>
                <p className="text-xs text-slate-grey">{gallery.visibility}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => { onClose(); setSelectedGalleryIds([]); }} className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200">Annuler</button>
          <button onClick={handleSave} disabled={selectedGalleryIds.length === 0} className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${action === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {action === 'add' ? 'Ajouter' : 'Retirer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Upload Modal
const UploadModal = ({ open, galleries, onClose, onUploadComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState([]);
  const [noGallery, setNoGallery] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [results, setResults] = useState({ success: 0, errors: [] });

  const toggleGallery = (id) => {
    setNoGallery(false);
    setSelectedGalleryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleNoGallery = () => {
    setNoGallery(!noGallery);
    if (!noGallery) {
      setSelectedGalleryIds([]);
    }
  };

  const handleFileSelect = (e) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...dropped]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (files.length === 0 || (!noGallery && selectedGalleryIds.length === 0)) return;
    setUploading(true);
    const token = localStorage.getItem('access_token');
    let success = 0;
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
      try {
        const formData = new FormData();
        formData.append('image', files[i]);
        formData.append('title', files[i].name.replace(/\.[^/.]+$/, ''));

        const res = await fetch(buildApiUrl('/api/galleries/images/'), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();

        // Add to galleries only if not "no gallery"
        if (!noGallery && selectedGalleryIds.length > 0) {
          await fetch(buildApiUrl(`/api/galleries/images/${data.id}/update_galleries/`), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ gallery_ids: selectedGalleryIds }),
          });
        }

        setUploadProgress(prev => ({ ...prev, [i]: 'success' }));
        success++;
      } catch (err) {
        setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
        errors.push(files[i].name);
      }
    }

    setResults({ success, errors });
    setUploading(false);
    setStep(3);
  };

  const reset = () => {
    setStep(1);
    setSelectedGalleryIds([]);
    setNoGallery(false);
    setFiles([]);
    setUploadProgress({});
    setResults({ success: 0, errors: [] });
    onClose();
    if (results.success > 0) onUploadComplete();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-space-indigo">
            {step === 1 && 'Sélectionner les galeries'}
            {step === 2 && 'Ajouter les images'}
            {step === 3 && 'Terminé'}
          </h3>
          <button onClick={reset} className="text-slate-grey hover:text-slate-grey">✕</button>
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-slate-grey mb-4">Dans quelles galeries ajouter les images ?</p>
            
            {/* Option sans galerie */}
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-4 ${noGallery ? 'border-orange-500 bg-orange-50' : 'border-slate-grey/20 hover:border-gray-300'}`}>
              <input type="checkbox" checked={noGallery} onChange={toggleNoGallery} className="w-4 h-4 text-orange-600 rounded" />
              <div>
                <p className="font-medium text-space-indigo">Sans galerie</p>
                <p className="text-xs text-slate-grey">Les images pourront être assignées plus tard</p>
              </div>
            </label>

            <div className="border-t pt-4 mb-2">
              <p className="text-xs text-slate-grey mb-2">Ou sélectionnez une ou plusieurs galeries :</p>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-auto mb-6">
              {galleries.map(g => (
                <label key={g.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedGalleryIds.includes(g.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-grey/20'} ${noGallery ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="checkbox" checked={selectedGalleryIds.includes(g.id)} onChange={() => toggleGallery(g.id)} disabled={noGallery} className="w-4 h-4 text-blue-600 rounded" />
                  <div>
                    <p className="font-medium text-space-indigo">{g.name}</p>
                    <p className="text-xs text-slate-grey">{g.visibility}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)} disabled={!noGallery && selectedGalleryIds.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Continuer</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-slate-grey mb-4">
              {noGallery 
                ? <span className="text-orange-600 font-medium">Sans galerie</span>
                : <>Galeries: {galleries.filter(g => selectedGalleryIds.includes(g.id)).map(g => g.name).join(', ')}</>
              }
            </p>
            
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 mb-4">
              <svg className="w-12 h-12 text-slate-grey mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-grey mb-2">Glissez-déposez vos images</p>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                Parcourir
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-auto mb-4">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-grey/5 rounded-lg">
                    <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 object-cover rounded" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    {uploadProgress[i] === 'uploading' && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                    {uploadProgress[i] === 'success' && <span className="text-green-600">✓</span>}
                    {uploadProgress[i] === 'error' && <span className="text-red-600">✗</span>}
                    {!uploadProgress[i] && <button onClick={() => removeFile(i)} className="text-slate-grey hover:text-red-600">✕</button>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200">Retour</button>
              <button onClick={handleUpload} disabled={files.length === 0 || uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'Upload...' : `Uploader ${files.length} image(s)`}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            {results.success > 0 && (
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium">{results.success} image(s) uploadée(s)</p>
              </div>
            )}
            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-4">
                <p className="font-medium text-red-600">{results.errors.length} erreur(s):</p>
                <ul className="text-sm text-red-600 list-disc pl-5">
                  {results.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagesManagementPage;

