"use client";

import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout';
import { buildApiUrl } from '@/app/lib/apiUtils';

const UsersManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [createModal, setCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'PUBLIC' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl('/api/auth/users/'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint doesn't exist yet, show placeholder
          setUsers([]);
          setLoading(false);
          return;
        }
        throw new Error('Erreur lors de la récupération des utilisateurs');
      }

      const data = await response.json();
      setUsers(data.results || data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/api/auth/users/${user.id}/`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }

      // Update local state
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      setEditModal({ open: false, user: null });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la modification du rôle');
    }
  };

  const handleDelete = async (user) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/api/auth/users/${user.id}/`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setUsers(users.filter(u => u.id !== user.id));
      setDeleteModal({ open: false, user: null });
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(buildApiUrl('/api/auth/users/create/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.error || 'Erreur lors de la création');
      }

      const createdUser = await response.json();
      setUsers([...users, createdUser]);
      setCreateModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'PUBLIC' });
    } catch (err) {
      console.error('Erreur:', err);
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'PRIVATE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-grey/10 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'PRIVATE':
        return 'Privé';
      default:
        return 'Public';
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-space-indigo">Gestion des utilisateurs</h1>
          <p className="text-slate-grey mt-1">{users.length} utilisateurs au total</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Nouvel utilisateur
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
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les rôles</option>
            <option value="ADMIN">Administrateurs</option>
            <option value="PRIVATE">Utilisateurs privés</option>
            <option value="PUBLIC">Utilisateurs publics</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-grey mt-4">Chargement des utilisateurs...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-grey/5 border-b border-slate-grey/20">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-grey uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-grey">
                      {users.length === 0 ? (
                        <div>
                          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-slate-grey mb-2">L'endpoint utilisateurs n'est pas encore configuré.</p>
                          <p className="text-sm text-slate-grey">Ajoutez les routes API pour /api/auth/users/ dans votre backend.</p>
                        </div>
                      ) : (
                        "Aucun utilisateur trouvé"
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-grey/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {(user.username || user.email)?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-space-indigo">{user.username}</p>
                            <p className="text-sm text-slate-grey">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-grey">
                          {user.date_joined 
                            ? new Date(user.date_joined).toLocaleDateString('fr-FR')
                            : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-sm ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditModal({ open: true, user })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier le rôle"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, user })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                            disabled={user.is_superuser}
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
      )}

      {/* Edit Role Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-space-indigo mb-4">
              Modifier le rôle de {editModal.user?.username}
            </h3>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleRoleChange(editModal.user, 'PUBLIC')}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                  editModal.user?.role === 'PUBLIC' ? 'border-blue-500 bg-blue-50' : 'border-slate-grey/20 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-space-indigo">Public</p>
                <p className="text-sm text-slate-grey">Accès aux galeries publiques uniquement</p>
              </button>
              <button
                onClick={() => handleRoleChange(editModal.user, 'PRIVATE')}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                  editModal.user?.role === 'PRIVATE' ? 'border-purple-500 bg-purple-50' : 'border-slate-grey/20 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-space-indigo">Privé</p>
                <p className="text-sm text-slate-grey">Accès aux galeries privées partagées</p>
              </button>
              <button
                onClick={() => handleRoleChange(editModal.user, 'ADMIN')}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                  editModal.user?.role === 'ADMIN' ? 'border-red-500 bg-red-50' : 'border-slate-grey/20 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-space-indigo">Administrateur</p>
                <p className="text-sm text-slate-grey">Accès complet à toutes les fonctionnalités</p>
              </button>
            </div>
            <button
              onClick={() => setEditModal({ open: false, user: null })}
              className="w-full px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
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
              Êtes-vous sûr de vouloir supprimer l'utilisateur "{deleteModal.user?.username}" ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ open: false, user: null })}
                className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteModal.user)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-space-indigo">
                Nouvel utilisateur
              </h3>
              <button
                onClick={() => setCreateModal(false)}
                className="text-slate-grey hover:text-slate-grey"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-shadow-grey mb-1">
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="johndoe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-shadow-grey mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-shadow-grey mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-shadow-grey mb-1">
                  Rôle
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PUBLIC">Public - Galeries publiques uniquement</option>
                  <option value="PRIVATE">Privé - Accès aux galeries privées</option>
                  <option value="ADMIN">Admin - Accès complet</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UsersManagementPage;

