/**
 * Centralized API client for backend communication.
 * Handles HttpOnly cookie authentication, concurrency-safe token refresh, and common API patterns.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '/media';

// Refresh Mutex State
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(error) {
  refreshSubscribers.forEach((cb) => cb(error));
  refreshSubscribers = [];
}

/**
 * Store user metadata (non-sensitive profile info only, no tokens)
 */
function setUser(user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Get stored user profile
 */
function getUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

/**
 * Clear cached user data
 */
function clearUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
}

/**
 * Attempt to refresh the access token via secure HttpOnly cookie
 */
async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    clearUser();
    throw new Error('Token refresh failed');
  }

  return response.json();
}

/**
 * Main fetch wrapper with automatic credentials and single-flight token refresh
 */
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Handle 401 Unauthorized with token refresh mutex
  const isAuthEndpoint =
    endpoint.includes('/api/auth/login') ||
    endpoint.includes('/api/auth/refresh') ||
    endpoint.includes('/api/auth/logout');

  if (response.status === 401 && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(null);
      } catch (err) {
        isRefreshing = false;
        onRefreshed(err);
        clearUser();
        throw new Error('Session expired. Please login again.');
      }
    } else {
      // Wait for concurrent refresh to complete
      await new Promise((resolve, reject) => {
        subscribeTokenRefresh((err) => (err ? reject(err) : resolve()));
      });
    }

    // Replay request with updated cookies
    response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });
  }

  return response;
}

// ============================================
// Authentication API
// ============================================

export const authApi = {
  /**
   * Login user with username and password (sets HttpOnly cookies)
   */
  async login(username, password) {
    const response = await apiFetch('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    return data;
  },

  /**
   * Logout current user (clears server cookies and local state)
   */
  async logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } finally {
      clearUser();
    }
  },

  /**
   * Get current authenticated user profile
   */
  async getMe() {
    const response = await apiFetch('/api/auth/me/');
    if (!response.ok) {
      clearUser();
      throw new Error('Failed to get user info');
    }
    const data = await response.json();
    setUser(data);
    return data;
  },

  /**
   * Accept an invitation and activate account
   */
  async acceptInvitation(invitationData) {
    const response = await apiFetch('/api/auth/accept-invitation/', {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });

    if (!response.ok) {
      let message = 'Échec de l\'activation de l\'invitation';
      try {
        const error = await response.json();
        message = error.detail || error.error || (error.password ? error.password[0] : null) || (error.non_field_errors ? error.non_field_errors[0] : null) || (error.password_confirm ? error.password_confirm[0] : null) || (typeof error === 'string' ? error : message);
      } catch (e) {}
      throw new Error(message);
    }

    const data = await response.json();
    if (data.user) {
      setUser(data.user);
    }
    return data;
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
   * Check if user is authenticated locally
   */
  isAuthenticated() {
    return !!getUser();
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

  /**
   * Get galleries configured for top navigation bar (ultra lightweight)
   */
  async getNavbar() {
    const response = await apiFetch('/api/galleries/navbar/');
    if (!response.ok) {
      throw new Error('Failed to fetch navbar galleries');
    }
    return response.json();
  },

  /**
   * Get featured galleries
   */
  async getFeatured() {
    const response = await apiFetch('/api/galleries/featured/');
    if (!response.ok) {
      throw new Error('Failed to fetch featured galleries');
    }
    return response.json();
  },

  /**
   * Toggle featured status for a gallery (admin only)
   */
  async toggleFeatured(slug) {
    const response = await apiFetch(`/api/galleries/${slug}/toggle_featured/`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to toggle featured status');
    }
    return response.json();
  },

  /**
   * Toggle top navbar visibility for a gallery (admin only)
   */
  async toggleNavbar(slug) {
    const response = await apiFetch(`/api/galleries/${slug}/toggle_navbar/`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to toggle navbar visibility');
    }
    return response.json();
  },
};

// ============================================
// Images API
// ============================================

export const imagesApi = {
  /**
   * Get all accessible images
   */
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
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
    if (galleryId) formData.append('gallery_ids', galleryId);
    formData.append('file', imageFile);
    if (metadata.title) formData.append('title', metadata.title);

    const response = await fetch(`${API_BASE_URL}/api/galleries/images/`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload image');
    }

    return response.json();
  },

  /**
   * Update image details
   */
  async update(id, data) {
    const response = await apiFetch(`/api/galleries/images/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
   * Get secure download/preview URL for an image
   */
  getDownloadUrl(id) {
    return `${API_BASE_URL}/api/media/secure/${id}/`;
  },

  /**
   * Download multiple images as a ZIP file
   */
  async downloadMultiple(imageIds) {
    const response = await fetch(`${API_BASE_URL}/api/galleries/images/download_multiple/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_ids: imageIds }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to download images';
      try {
        const error = await response.json();
        errorMessage = error.error || error.detail || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.blob();
  },
};

// ============================================
// Named and Default Exports
// ============================================

export const { login, logout, getCurrentUser, changePassword } = authApi;
export const {
  getAll: getGalleries,
  getPublic: getPublicGalleries,
  getBySlug: getGalleryDetails,
  getImages: getGalleryImages,
  create: createGallery,
  update: updateGallery,
  delete: deleteGallery,
} = galleriesApi;
export const {
  getAll: getAllImages,
  getById: getImage,
  update: updateImage,
  getDownloadUrl,
  downloadMultiple,
} = imagesApi;

export { API_BASE_URL, MEDIA_URL };

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
