"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '../../../AdminLayout';

const GALLERY_TYPES = [
  { value: 'BESTOF', label: 'Best Of' },
  { value: 'BW', label: 'Noir & Blanc' },
  { value: 'STREETS', label: 'Street Photography' },
  { value: 'EXPLORE', label: 'Exploration' },
  { value: 'PORTRAIT', label: 'Portrait' },
  { value: 'MARIAGE', label: 'Mariage' },
  { value: 'BAPTEME', label: 'Baptême' },
  { value: 'ANNIVERSAIRE', label: 'Anniversaire' },
  { value: 'FAMILLE', label: 'Famille' },
  { value: 'PROFESSIONNEL', label: 'Professionnel' },
  { value: 'EVENEMENT', label: 'Événement' },
  { value: 'OTHER', label: 'Autre' },
];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Publique', description: 'Visible par tous les visiteurs' },
  { value: 'PRIVATE', label: 'Privée', description: 'Accessible uniquement aux groupes autorisés' },
];

const EditGalleryPage = () => {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    gallery_type: 'OTHER',
    visibility: 'PUBLIC',
    event_date: '',
    event_location: '',
    is_featured: false,
    allow_download: true,
    display_order: 0,
    allowed_groups: [],
  });

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [existingCover, setExistingCover] = useState(null);

  // Fetch gallery data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        // Fetch gallery
        const galleryRes = await fetch(`http://localhost:8000/api/galleries/${slug}/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!galleryRes.ok) {
          throw new Error('Galerie non trouvée');
        }
        
        const gallery = await galleryRes.json();
        
        setFormData({
          name: gallery.name || '',
          slug: gallery.slug || '',
          description: gallery.description || '',
          gallery_type: gallery.gallery_type || 'OTHER',
          visibility: gallery.visibility || 'PUBLIC',
          event_date: gallery.event_date || '',
          event_location: gallery.event_location || '',
          is_featured: gallery.is_featured || false,
          allow_download: gallery.allow_download !== false,
          display_order: gallery.display_order || 0,
          allowed_groups: gallery.allowed_groups?.map(g => g.id || g) || [],
        });
        
        if (gallery.cover_url) {
          setExistingCover(gallery.cover_url);
        }
        
        // Fetch user groups
        const groupsRes = await fetch('http://localhost:8000/api/galleries/groups/', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setUserGroups(groupsData.results || groupsData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGroupToggle = (groupId) => {
    setFormData(prev => ({
      ...prev,
      allowed_groups: prev.allowed_groups.includes(groupId)
        ? prev.allowed_groups.filter(id => id !== groupId)
        : [...prev.allowed_groups, groupId]
    }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
    setExistingCover(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      
      // Create FormData for multipart upload
      const data = new FormData();
      data.append('name', formData.name);
      data.append('slug', formData.slug);
      data.append('description', formData.description);
      data.append('gallery_type', formData.gallery_type);
      data.append('visibility', formData.visibility);
      data.append('is_featured', formData.is_featured);
      data.append('allow_download', formData.allow_download);
      data.append('display_order', formData.display_order);
      
      if (formData.event_date) {
        data.append('event_date', formData.event_date);
      }
      if (formData.event_location) {
        data.append('event_location', formData.event_location);
      }
      
      // Add allowed groups
      formData.allowed_groups.forEach(groupId => {
        data.append('allowed_groups', groupId);
      });
      
      // Add cover image if selected
      if (coverImage) {
        data.append('cover_image', coverImage);
      }

      const response = await fetch(`http://localhost:8000/api/galleries/${slug}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.name?.[0] || 'Erreur lors de la mise à jour');
      }

      const updatedGallery = await response.json();
      
      // Redirect to new slug if it changed
      if (updatedGallery.slug !== slug) {
        router.push(`/admin/galleries/${updatedGallery.slug}/edit`);
      } else {
        router.push('/admin/galleries');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/galleries')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux galeries
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Modifier la galerie</h1>
          <p className="text-gray-600 mt-1">{formData.name}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la galerie *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /gallery/{formData.slug}</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de galerie
                </label>
                <select
                  name="gallery_type"
                  value={formData.gallery_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {GALLERY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Image de couverture</h2>
            
            <div className="flex items-start gap-6">
              <div className="w-40 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                {(coverPreview || existingCover) ? (
                  <>
                    <img 
                      src={coverPreview || existingCover} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover" 
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Changer l'image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">Format recommandé: 16:9, JPG ou PNG</p>
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visibilité</h2>
            
            <div className="space-y-3">
              {VISIBILITY_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.visibility === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={formData.visibility === option.value}
                    onChange={handleChange}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Private gallery options */}
            {formData.visibility === 'PRIVATE' && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-gray-900 mb-3">Groupes autorisés</h3>
                {userGroups.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun groupe créé.</p>
                ) : (
                  <div className="space-y-2">
                    {userGroups.map(group => (
                      <label
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                          formData.allowed_groups.includes(group.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.allowed_groups.includes(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-gray-500">{group.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Info (for private galleries) */}
          {formData.visibility === 'PRIVATE' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'événement</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de l'événement
                  </label>
                  <input
                    type="date"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lieu de l'événement
                  </label>
                  <input
                    type="text"
                    name="event_location"
                    value={formData.event_location}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Options</h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Galerie mise en avant</p>
                  <p className="text-sm text-gray-500">Afficher cette galerie en priorité</p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="allow_download"
                  checked={formData.allow_download}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Autoriser le téléchargement</p>
                  <p className="text-sm text-gray-500">Les visiteurs peuvent télécharger les images</p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push('/admin/galleries')}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default EditGalleryPage;
