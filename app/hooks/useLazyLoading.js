'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * useIntersectionObserver - Hook for lazy loading with Intersection Observer
 * Returns whether the element is visible in the viewport
 */
export function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        
        // Once visible, stay loaded
        if (visible && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasBeenVisible, options]);

  return { elementRef, isVisible: hasBeenVisible || isVisible, hasBeenVisible };
}

/**
 * useLazyImage - Hook for lazy loading images
 */
export function useLazyImage(src, options = {}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { elementRef, isVisible } = useIntersectionObserver(options);

  useEffect(() => {
    if (!isVisible || !src) return;

    // Start loading image when visible
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setHasError(true);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src]);

  return { 
    elementRef, 
    imageSrc, 
    isLoaded, 
    hasError, 
    isVisible 
  };
}
