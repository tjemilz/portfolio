'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import AdminLayout from '../AdminLayout';
import Image from 'next/image';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

export default function PrintRequestsPage() {
  const { getToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/galleries/print-requests/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      // S'assurer que requests est toujours un tableau
      setRequests(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Erreur lors du chargement des demandes:', err);
      setRequests([]); // Initialiser avec un tableau vide en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, newStatus) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/galleries/print-requests/${requestId}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        fetchRequests();
        if (selectedRequest?.id === requestId) {
          const updatedRequest = await response.json();
          setSelectedRequest(updatedRequest);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  const deleteRequest = async (requestId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'impression ?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/galleries/print-requests/${requestId}/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchRequests();
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(null);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-space-indigo">
            Demandes d'impression
          </h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-accent text-white' : 'bg-gray-100 text-slate-grey hover:bg-gray-200'
              }`}
            >
              Toutes ({requests.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'PENDING' ? 'bg-accent text-white' : 'bg-gray-100 text-slate-grey hover:bg-gray-200'
              }`}
            >
              En attente ({requests.filter(r => r.status === 'PENDING').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des demandes */}
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-slate-grey">Aucune demande trouvée</p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedRequest?.id === request.id ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-space-indigo">
                        Demande #{request.id}
                      </h3>
                      <p className="text-sm text-slate-grey">
                        {request.user_username} ({request.user_email})
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-slate-grey">Articles</p>
                      <p className="font-semibold">{request.total_items}</p>
                    </div>
                    <div>
                      <p className="text-slate-grey">Total estimé</p>
                      <p className="font-semibold text-accent">{parseFloat(request.estimated_total || 0).toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-slate-grey">Date</p>
                      <p className="font-semibold">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <p className="text-slate-grey">Notes: {request.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Détails de la demande */}
          {selectedRequest && (
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-space-indigo mb-4">
                Détails de la demande #{selectedRequest.id}
              </h2>

              {/* Changer le statut */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-space-indigo mb-2">
                  Statut
                </label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="PENDING">En attente</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminée</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
              </div>

              {/* Informations client */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-space-indigo mb-2">Client</h3>
                <p className="text-sm">{selectedRequest.user_username}</p>
                <p className="text-sm text-slate-grey">{selectedRequest.user_email}</p>
              </div>

              {/* Articles */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-space-indigo mb-3">
                  Articles ({selectedRequest.total_items})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.image_thumbnail || '/placeholder.jpg'}
                          alt={item.image_title || 'Photo'}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-space-indigo">
                          {item.image_title || 'Sans titre'}
                        </p>
                        <p className="text-xs text-slate-grey">
                          {item.print_size_display}
                        </p>
                        {item.custom_size && (
                          <p className="text-xs text-slate-grey italic">
                            Format: {item.custom_size}
                          </p>
                        )}
                        <p className="text-xs text-slate-grey">
                          Quantité: {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-accent mt-1">
                          {parseFloat(item.estimated_price || 0).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total estimé:</span>
                  <span className="text-accent">{parseFloat(selectedRequest.estimated_total || 0).toFixed(2)} €</span>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-space-indigo mb-2">
                    Notes du client
                  </h3>
                  <div className="bg-gray-50 rounded p-3 text-sm text-slate-grey">
                    {selectedRequest.notes}
                  </div>
                </div>
              )}

              {/* Supprimer la demande */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => deleteRequest(selectedRequest.id)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Supprimer la demande
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
