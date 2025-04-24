"use client";

import { useState, useEffect } from 'react';

export function useBestOfImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true);
        const response = await fetch('/api/bestof-images');
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.images) {
          setImages(data.images);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des meilleures images:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, []);

  return { images, loading, error };
}