"use client";

import { useState, useEffect } from 'react';

export function useStreetImages() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/street-images');
        const data = await response.json();
        if (data.images) {
          setImages(data.images);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des images:', error);
      }
    }

    fetchImages();
  }, []);

  return { images };
}