"use client";

import { useState, useEffect, useCallback } from 'react';
import { galleriesApi } from '../lib/api';

/**
 * Hook to fetch and manage a single gallery
 */
export function useGallery(slug) {
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGallery = useCallback(async () => {
    if (!slug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getBySlug(slug);
      setGallery(data);
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  return { gallery, loading, error, refetch: fetchGallery };
}

/**
 * Hook to fetch all galleries
 */
export function useGalleries(params = {}) {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getAll(params);
      setGalleries(data.results || data);
    } catch (err) {
      console.error('Error fetching galleries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  return { galleries, loading, error, refetch: fetchGalleries };
}

/**
 * Hook to fetch images from a gallery
 */
export function useGalleryImages(slug) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImages = useCallback(async () => {
    if (!slug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getImages(slug);
      setImages(data);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return { images, loading, error, refetch: fetchImages };
}

/**
 * Hook to fetch public galleries grouped by type
 */
export function usePublicGalleries() {
  const [galleries, setGalleries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getPublic();
      setGalleries(data);
    } catch (err) {
      console.error('Error fetching public galleries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  return { galleries, loading, error, refetch: fetchGalleries };
}

export default {
  useGallery,
  useGalleries,
  useGalleryImages,
  usePublicGalleries,
};
