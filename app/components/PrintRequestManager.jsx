'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import Image from 'next/image';

const PRINT_SIZES = [
  { value: '10x15', label: '10x15 cm', price: 0.50 },
  { value: '50x70', label: '50x70 cm', price: 40.00 },
  { value: 'other', label: 'Autre (à discuter)', price: 0.00 },
];

export default function PrintRequestManager() {
  const { user, token } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Charger les galeries accessibles (privées + publiques)
  useEffect(() => {
    async function fetchGalleries() {
      try {
        // Récupérer les galeries publiques
        const publicResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/galleries/public/`);
        const publicData = await publicResponse.json();
        
        console.log('Public galleries data:', publicData);
        
        // Extraire toutes les galeries publiques
        const allPublicGalleries = [];
        if (publicData && typeof publicData === 'object') {
          Object.entries(publicData).forEach(([type, galleriesArray]) => {
            if (Array.isArray(galleriesArray)) {
              galleriesArray.forEach(gallery => {
                if (!allPublicGalleries.find(g => g.id === gallery.id)) {
                  allPublicGalleries.push(gallery);
                }
              });
            }
          });
        }
        
        console.log('All public galleries:', allPublicGalleries);
        
        // Si on a un token, récupérer aussi les galeries privées
        let allGalleries = [...allPublicGalleries];
        if (token) {
          try {
            const privateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/galleries/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            const privateData = await privateResponse.json();
            
            console.log('Private galleries data:', privateData);
            
            // Gérer les différentes structures de réponse
            const privateGalleries = Array.isArray(privateData) 
              ? privateData 
              : (privateData.results || []);
            
            // Combiner et supprimer les doublons
            privateGalleries.forEach(gallery => {
              if (!allGalleries.find(g => g.id === gallery.id)) {
                allGalleries.push(gallery);
              }
            });
          } catch (err) {
            console.log('Erreur chargement galeries privées (normal si pas admin):', err);
          }
        }
        
        // Trier par display_order ou nom
        allGalleries.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        
        console.log('Final galleries list:', allGalleries);
        setGalleries(allGalleries);
      } catch (err) {
        console.error('Erreur lors du chargement des galeries:', err);
        setGalleries([]);
      }
    }

    fetchGalleries();
  }, [token]);

  // Charger les images d'une galerie
  const loadGalleryImages = async (gallerySlug) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/galleries/${gallerySlug}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setGalleryImages(data.images || []);
    } catch (err) {
      console.error('Erreur lors du chargement des images:', err);
    }
  };

  useEffect(() => {
    if (selectedGallery) {
      loadGalleryImages(selectedGallery);
    }
  }, [selectedGallery]);

  // Ajouter une image au panier
  const addToCart = (image, printSize, quantity = 1, customSize = '') => {
    const sizeInfo = PRINT_SIZES.find(s => s.value === printSize);
    
    setCart([...cart, {
      image: image.id,
      imageData: image,
      print_size: printSize,
      quantity,
      custom_size: customSize,
      unitPrice: sizeInfo?.price || 0,
    }]);
  };

  // Retirer du panier
  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calculer le total
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  // Soumettre la demande
  const submitRequest = async () => {
    if (cart.length === 0) {
      setError('Veuillez ajouter au moins une photo au panier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/galleries/print-requests/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes,
            items: cart.map(item => ({
              image: item.image,
              print_size: item.print_size,
              quantity: item.quantity,
              custom_size: item.custom_size,
            })),
          }),
        }
      );

      if (response.ok) {
        setSuccess(true);
        setCart([]);
        setNotes('');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Erreur lors de la soumission');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-grey">Veuillez vous connecter pour faire une demande d'impression.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-bold text-space-indigo mb-8">
        Demande d'impression
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sélection des photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sélection de galerie */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-space-indigo mb-4">
              1. Choisissez une galerie
            </h2>
            <select
              value={selectedGallery}
              onChange={(e) => setSelectedGallery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="">-- Sélectionner une galerie --</option>
              {galleries.map((gallery) => (
                <option key={gallery.id} value={gallery.slug}>
                  {gallery.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grille d'images */}
          {selectedGallery && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-space-indigo mb-4">
                2. Sélectionnez les photos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {galleryImages.map((image) => (
                  <ImageSelector
                    key={image.id}
                    image={image}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panier */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-space-indigo mb-4">
              Votre panier
            </h2>

            {cart.length === 0 ? (
              <p className="text-slate-grey text-sm text-center py-8">
                Aucune photo sélectionnée
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={item.imageData.thumbnail_url || item.imageData.image_url}
                          alt={item.imageData.title || 'Photo'}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-space-indigo truncate">
                          {item.imageData.title || 'Sans titre'}
                        </p>
                        <p className="text-xs text-slate-grey">
                          {PRINT_SIZES.find(s => s.value === item.print_size)?.label}
                        </p>
                        <p className="text-xs text-slate-grey">
                          Quantité: {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-accent mt-1">
                          {(item.unitPrice * item.quantity).toFixed(2)} €
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total estimé:</span>
                    <span className="text-accent">{calculateTotal().toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-slate-grey mt-1">
                    Prix à titre indicatif
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-space-indigo mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                    placeholder="Demandes spéciales, instructions..."
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    ✓ Demande envoyée avec succès !
                  </div>
                )}

                <button
                  onClick={submitRequest}
                  disabled={loading}
                  className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour sélectionner une image
function ImageSelector({ image, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('10x15');
  const [quantity, setQuantity] = useState(1);
  const [customSize, setCustomSize] = useState('');

  const handleAdd = () => {
    onAdd(image, selectedSize, quantity, customSize);
    setShowModal(false);
    setQuantity(1);
    setCustomSize('');
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="relative aspect-square cursor-pointer group rounded-lg overflow-hidden"
      >
        <Image
          src={image.thumbnail_url || image.image_url}
          alt={image.title || 'Photo'}
          fill
          className="object-cover transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-space-indigo mb-4">
              Ajouter au panier
            </h3>

            <div className="relative aspect-video mb-4">
              <Image
                src={image.image_url || image.thumbnail_url}
                alt={image.title || 'Photo'}
                fill
                className="object-contain"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-indigo mb-2">
                  Format d'impression
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  {PRINT_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label} {size.price > 0 && `- ${size.price.toFixed(2)}€`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSize === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-space-indigo mb-2">
                    Format personnalisé
                  </label>
                  <input
                    type="text"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    placeholder="Ex: 30x40 cm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-space-indigo mb-2">
                  Quantité
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
