/**
 * Centralized API client for backend communication.
 * Handles authentication tokens and common API patterns.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '/media';

/**
 * Get stored access token
 */
function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Get stored refresh token
 */
function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

/**
 * Store tokens after login
 */
function setTokens(accessToken, refreshToken) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

/**
 * Clear tokens on logout
 */
function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

/**
 * Store user data
 */
function setUser(user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Get stored user data
 */
function getUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  setTokens(data.access, data.refresh || refreshToken);
  return data.access;
}

/**
 * Main fetch wrapper with authentication
 */
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && token) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      // Refresh failed, clear tokens
      clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

// ============================================
// Authentication API
// ============================================

export const authApi = {
  /**
   * Login user with email/username and password
   */
  async login(username, password) {
    const response = await apiFetch('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data;
  },

  /**
   * Logout current user
   */
  async logout() {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await apiFetch('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } finally {
      clearTokens();
    }
  },

  /**
   * Get current user info
   */
  async getMe() {
    const response = await apiFetch('/api/auth/me/');
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    return response.json();
  },

  /**
   * Change password
   */
  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    const response = await apiFetch('/api/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Password change failed');
    }

    return response.json();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!getAccessToken();
  },

  /**
   * Get current user from storage
   */
  getCurrentUser() {
    return getUser();
  },
};

// ============================================
// Galleries API
// ============================================

export const galleriesApi = {
  /**
   * Get all accessible galleries
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.append('type', params.type);
    if (params.visibility) searchParams.append('visibility', params.visibility);
    if (params.page) searchParams.append('page', params.page);

    const query = searchParams.toString();
    const response = await apiFetch(`/api/galleries/${query ? `?${query}` : ''}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch galleries');
    }
    
    return response.json();
  },

  /**
   * Get public galleries grouped by type
   */
  async getPublic() {
    const response = await apiFetch('/api/galleries/public/');
    if (!response.ok) {
      throw new Error('Failed to fetch public galleries');
    }
    return response.json();
  },

  /**
   * Get a single gallery by slug
   */
  async getBySlug(slug) {
    const response = await apiFetch(`/api/galleries/${slug}/`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Gallery not found');
      }
      throw new Error('Failed to fetch gallery');
    }
    return response.json();
  },

  /**
   * Get images for a gallery
   */
  async getImages(slug) {
    const response = await apiFetch(`/api/galleries/${slug}/images/`);
    if (!response.ok) {
      throw new Error('Failed to fetch gallery images');
    }
    return response.json();
  },

  /**
   * Create a new gallery (admin only)
   */
  async create(galleryData) {
    const response = await apiFetch('/api/galleries/', {
      method: 'POST',
      body: JSON.stringify(galleryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create gallery');
    }

    return response.json();
  },

  /**
   * Update a gallery (admin only)
   */
  async update(slug, galleryData) {
    const response = await apiFetch(`/api/galleries/${slug}/`, {
      method: 'PATCH',
      body: JSON.stringify(galleryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update gallery');
    }

    return response.json();
  },

  /**
   * Delete a gallery (admin only)
   */
  async delete(slug) {
    const response = await apiFetch(`/api/galleries/${slug}/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete gallery');
    }
  },
};

// ============================================
// Images API
// ============================================

export const imagesApi = {
  /**
   * Get all images with optional filters
   */
  async getAll(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.gallery) searchParams.append('gallery', params.gallery);
    if (params.gallery_slug) searchParams.append('gallery_slug', params.gallery_slug);

    const query = searchParams.toString();
    const response = await apiFetch(`/api/galleries/images/${query ? `?${query}` : ''}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    
    return response.json();
  },

  /**
   * Get a single image
   */
  async getById(id) {
    const response = await apiFetch(`/api/galleries/images/${id}/`);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    return response.json();
  },

  /**
   * Upload an image (admin only)
   */
  async upload(galleryId, imageFile, metadata = {}) {
    const formData = new FormData();
    formData.append('gallery', galleryId);
    formData.append('image', imageFile);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.alt_text) formData.append('alt_text', metadata.alt_text);

    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/galleries/images/`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload image');
    }

    return response.json();
  },

  /**
   * Delete an image (admin only)
   */
  async delete(id) {
    const response = await apiFetch(`/api/galleries/images/${id}/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }
  },

  /**
   * Get all images (admin function)
   */
  async getAll(params = {}) {
    const query = new URLSearchParams({
      page_size: 'all',
      ...params
    }).toString();
    const response = await apiFetch(`/api/galleries/images/${query ? `?${query}` : ''}`);
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    return response.json();
  },

  /**
   * Update an image
   */
  async update(id, data) {
    const response = await apiFetch(`/api/galleries/images/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Get download URL for an image
   */
  getDownloadUrl(id) {
    return `${API_BASE_URL}/api/galleries/images/${id}/download/`;
  },

  /**
   * Download multiple images as a ZIP file
   */
  async downloadMultiple(imageIds) {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/galleries/images/download_multiple/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image_ids: imageIds }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to download images';
      try {
        const error = await response.json();
        errorMessage = error.error || error.detail || errorMessage;
      } catch (e) {
        // Response might not be JSON
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Return the blob for download
    return response.blob();
  },
};

// ============================================
// Named exports for convenience
// ============================================

// Auth functions
export const { login, logout, getCurrentUser, changePassword } = authApi;

// Gallery functions  
export const { getGalleries, getPublicGalleries, getGalleryDetails, getGalleryImages, createGallery, updateGallery, deleteGallery } = galleriesApi;

// Image functions
export const { getAll: getAllImages, getImage, update: updateImage, getDownloadUrl, downloadMultiple } = imagesApi;

// ============================================
// Utility exports
// ============================================

export { API_BASE_URL, MEDIA_URL };

/**
 * Build full media URL from relative path
 */
export function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}/${path.replace(/^\//, '')}`;
}

export default {
  auth: authApi,
  galleries: galleriesApi,
  images: imagesApi,
  getMediaUrl,
};
