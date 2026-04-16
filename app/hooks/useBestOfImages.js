"use client";

import { useState, useEffect, useCallback } from 'react';
import { galleriesApi } from '../lib/api';

/**
 * Hook to fetch images from the "best-of" gallery
 */
export function useBestOfImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await galleriesApi.getImages('best-of');
      setImages(data);
    } catch (err) {
      console.error('Error fetching best-of images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return { images, loading, error, refetch: fetchImages };
}