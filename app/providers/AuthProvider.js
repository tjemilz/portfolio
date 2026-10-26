"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * Manages user authentication state based on HttpOnly cookies
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Validate authentication status with backend
   */
  const checkAuth = useCallback(async () => {
    setError(null);
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login handler
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
   * Logout handler
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
   * Force refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || !!user?.is_superuser,
    isPrivate: user?.role === 'PRIVATE' || user?.role === 'ADMIN' || !!user?.is_superuser,
    login,
    logout,
    checkAuth,
    refreshUser,
    getToken: () => null, // Backwards-compatibility helper for any legacy callers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
