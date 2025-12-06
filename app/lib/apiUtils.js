/**
 * API Utilities
 * Helper functions for API calls with proper URL handling
 */

/**
 * Build a full API URL from an endpoint path
 * Uses relative URLs by default, falling back to NEXT_PUBLIC_API_URL if set
 */
export function buildApiUrl(endpoint) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  // If endpoint starts with http, return as-is (for absolute URLs)
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // If endpoint doesn't start with /, add it
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If no base URL, return relative path (Nginx will route it)
  if (!baseUrl) {
    return path;
  }
  
  // Otherwise, return absolute URL
  return `${baseUrl}${path}`;
}

/**
 * Fetch wrapper that uses buildApiUrl
 */
export async function apiFetch(endpoint, options = {}) {
  const url = buildApiUrl(endpoint);
  return fetch(url, options);
}

/**
 * Get API base URL for use in components
 */
export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '';
}
