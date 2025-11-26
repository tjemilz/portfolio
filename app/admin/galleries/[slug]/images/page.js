"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../AdminLayout';

const GalleryImagesPage = () => {
  const params = useParams();
  const slug = params.slug;
  
  const [gallery, setGallery] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch gallery and all images in parallel
      const [galleryRes, imagesRes] = await Promise.all([
        fetch(`http://localhost:8000/api/galleries/${slug}/`, { headers }),
        fetch('http://localhost:8000/api/images/?page_size=all', { headers })
      ]);

      if (!galleryRes.ok) {
        throw new Error('Galerie non trouvée');
      }

      const galleryData = await galleryRes.json();
      const imagesData = await imagesRes.json();

      setGallery(galleryData);
      setAllImages(imagesData.results || imagesData);
      
      // Initialize selected images from gallery
      const galleryImageIds = new Set(
        (galleryData.images || []).map(img => img.id)
      );
      setSelectedImages(galleryImageIds);
      
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleImage = (imageId) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Get current gallery images
      const currentImageIds = new Set((gallery.images || []).map(img => img.id));
      
      // Find images to add and remove
      const toAdd = [...selectedImages].filter(id => !currentImageIds.has(id));
      const toRemove = [...currentImageIds].filter(id => !selectedImages.has(id));

      // Update each image
      const updatePromises = [];
      
      // For images to add, add this gallery to their galleries
      for (const imageId of toAdd) {
        const image = allImages.find(img => img.id === imageId);
        if (image) {
          const currentGalleryIds = (image.galleries || []).map(g => g.id);
          updatePromises.push(
            fetch(`http://localhost:8000/api/images/${imageId}/`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                gallery_ids: [...currentGalleryIds, gallery.id]
              })
            })
          );
        }
      }

      // For images to remove, remove this gallery from their galleries
      for (const imageId of toRemove) {
        const image = allImages.find(img => img.id === imageId);
        if (image) {
          const currentGalleryIds = (image.galleries || []).map(g => g.id);
          updatePromises.push(
            fetch(`http://localhost:8000/api/images/${imageId}/`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                gallery_ids: currentGalleryIds.filter(gid => gid !== gallery.id)
              })
            })
          );
        }
      }

      await Promise.all(updatePromises);
      
      // Refresh data
      await fetchData();
      alert('Images mises à jour avec succès');
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour des images');
    } finally {
      setSaving(false);
    }
  };

  const filteredImages = allImages.filter(image => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (image.title && image.title.toLowerCase().includes(query)) ||
      (image.description && image.description.toLowerCase().includes(query))
    );
  });

  const galleryImageCount = selectedImages.size;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/galleries" className="hover:text-blue-600">
              Galeries
            </Link>
            <span>/</span>
            <span>{gallery?.name}</span>
            <span>/</span>
            <span>Images</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gérer les images de "{gallery?.name}"
          </h1>
          <p className="text-gray-600 mt-1">
            {galleryImageCount} images sélectionnées sur {allImages.length}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/galleries"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retour
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Search and Selection */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Tout sélectionner
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tout désélectionner
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-white rounded-xl shadow p-6">
        {filteredImages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune image trouvée
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredImages.map((image) => {
              const isSelected = selectedImages.has(image.id);
              return (
                <div
                  key={image.id}
                  onClick={() => toggleImage(image.id)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={image.title || 'Image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Selection indicator */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-blue-500' : 'bg-white/80'
                  }`}>
                    {isSelected ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                    )}
                  </div>

                  {/* Image title */}
                  {image.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.title}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GalleryImagesPage;
