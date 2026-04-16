'use client';

import { useState } from 'react';
import Image from 'next/image';

const PRINT_SIZES = [
  { value: '10x15', label: '10x15 cm', price: 0.50 },
  { value: '50x70', label: '50x70 cm', price: 40.00 },
  { value: 'other', label: 'Autre (à discuter)', price: 0.00 },
];

export default function PrintRequestModal({ 
  isOpen, 
  onClose, 
  selectedImages = [], 
  gallerySlug,
  getToken 
}) {
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Initialiser le panier avec les images sélectionnées
  useState(() => {
    if (selectedImages.length > 0 && cart.length === 0) {
      const initialCart = selectedImages.map(image => ({
        image: image.id,
        imageData: image,
        print_size: '10x15',
        quantity: 1,
        custom_size: '',
        unitPrice: 0.50,
      }));
      setCart(initialCart);
    }
  }, [selectedImages]);

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    newCart[index][field] = value;
    
    // Mettre à jour le prix unitaire si la taille change
    if (field === 'print_size') {
      const sizeInfo = PRINT_SIZES.find(s => s.value === value);
      newCart[index].unitPrice = sizeInfo?.price || 0;
    }
    
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  const submitRequest = async () => {
    if (cart.length === 0) {
      setError('Aucune image sélectionnée');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Vous devez être connecté pour faire une demande d\'impression');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${apiUrl}/api/galleries/print-requests/`;
      
      console.log('Sending print request to:', url);
      console.log('Token:', token?.substring(0, 20) + '...');
      
      const requestBody = {
        items: cart.map(item => ({
          image: item.image,
          print_size: item.print_size,
          quantity: item.quantity,
          custom_size: item.custom_size || '',
        })),
        notes: notes,
      };
      
      console.log('Request body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCart([]);
          setNotes('');
        }, 2000);
      } else {
        // Essayer de lire la réponse comme texte d'abord
        const responseText = await response.text();
        console.error('Error response text:', responseText);
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('Error response JSON:', errorData);
          setError(errorData.detail || errorData.error || JSON.stringify(errorData));
        } catch (parseError) {
          // Si ce n'est pas du JSON, afficher le texte brut
          setError(`Erreur serveur: ${responseText.substring(0, 500)}`);
        }
      }
    } catch (err) {
      console.error('Request failed:', err);
      setError(`Erreur de connexion: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-grey/20">
          <h2 className="text-2xl font-serif font-bold text-space-indigo">
            Demande d'impression
          </h2>
          <button
            onClick={onClose}
            className="text-slate-grey hover:text-space-indigo transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Demande envoyée avec succès !</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {cart.map((item, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Image */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={item.imageData.thumbnail_url || item.imageData.image_url}
                    alt={item.imageData.title || 'Photo'}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Size selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-grey mb-1">
                      Format
                    </label>
                    <select
                      value={item.print_size}
                      onChange={(e) => updateCartItem(index, 'print_size', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      {PRINT_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label} {size.price > 0 && `- ${size.price.toFixed(2)}€`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom size if "other" */}
                  {item.print_size === 'other' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-grey mb-1">
                        Taille personnalisée
                      </label>
                      <input
                        type="text"
                        value={item.custom_size}
                        onChange={(e) => updateCartItem(index, 'custom_size', e.target.value)}
                        placeholder="ex: 30x40 cm"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-slate-grey mb-1">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateCartItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                  </div>

                  {/* Price */}
                  <div className="flex items-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-grey">Prix unitaire</p>
                      <p className="text-sm font-semibold text-space-indigo">
                        {item.unitPrice > 0 ? `${item.unitPrice.toFixed(2)}€` : 'À définir'}
                      </p>
                      {item.quantity > 1 && item.unitPrice > 0 && (
                        <p className="text-xs text-slate-grey">
                          Total: {(item.unitPrice * item.quantity).toFixed(2)}€
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-slate-grey hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-space-indigo mb-2">
              Notes supplémentaires (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Précisions, instructions spéciales, questions..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-grey/20 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-space-indigo">
              Total estimé
            </span>
            <span className="text-2xl font-bold text-accent">
              {calculateTotal() > 0 ? `${calculateTotal().toFixed(2)}€` : 'À définir'}
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-slate-grey/30 text-slate-grey rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={submitRequest}
              disabled={loading || cart.length === 0}
              className="flex-1 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
