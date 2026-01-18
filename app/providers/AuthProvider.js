"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * Wraps the app to provide auth state and functions
 */
export function AuthProvider({ children }) {
  // Initialiser avec l'utilisateur du localStorage si disponible
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  // Si on a un utilisateur dans le localStorage, pas besoin de loading
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const storedUser = localStorage.getItem('user');
    const hasToken = localStorage.getItem('access_token');
    // Pas de loading si on a déjà un utilisateur ET un token
    return !(storedUser && hasToken);
  });
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check if user is authenticated
   */
  const checkAuth = useCallback(async () => {
    setError(null);
    
    try {
      // D'abord vérifier si on a un token
      if (!authApi.isAuthenticated()) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // L'utilisateur est déjà chargé depuis le state initial
      const currentUser = authApi.getCurrentUser();
      if (currentUser && !user) {
        setUser(currentUser);
      }
      
      // Valider avec l'API en arrière-plan (sans bloquer)
      try {
        const userData = await authApi.getMe();
        setUser(userData);
        // Mettre à jour le localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (apiError) {
        // Garder l'utilisateur du localStorage si l'API échoue
      }
    } catch (err) {
      console.error('[Auth] Auth check failed:', err);
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Login with username/email and password
   */
  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await authApi.login(username, password);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!authApi.isAuthenticated()) return;
    
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      throw err;
    }
  }, []);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.is_superuser,
    isPrivate: user?.role === 'PRIVATE' || user?.role === 'ADMIN' || user?.is_superuser,
    login,
    logout,
    checkAuth,
    refreshUser,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
