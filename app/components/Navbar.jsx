"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import UserMenu from './UserMenu';
import { galleriesApi } from '../lib/api';

const Navbar = () => {
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMouseNear, setIsMouseNear] = useState(false);
  const [publicGalleries, setPublicGalleries] = useState([]);
  const [galleriesLoading, setGalleriesLoading] = useState(true);
  const navbarRef = useRef(null);
  const mouseDetectionAreaRef = useRef(null);
  const isHomePage = pathname === '/';
  
  // Charger les galeries publiques
  useEffect(() => {
    async function fetchGalleries() {
      try {
        const data = await galleriesApi.getPublic();
        // Flatten all galleries from different types, excluding 'bestof'
        const allGalleries = [];
        Object.entries(data).forEach(([type, galleries]) => {
          galleries.forEach(gallery => {
            // Exclure bestof car il est utilisé sur la page d'accueil
            if (gallery.slug !== 'bestof') {
              allGalleries.push(gallery);
            }
          });
        });
        // Trier par display_order ou nom
        allGalleries.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setPublicGalleries(allGalleries);
      } catch (error) {
        console.error('Error fetching galleries for navbar:', error);
      } finally {
        setGalleriesLoading(false);
      }
    }
    fetchGalleries();
  }, []);
  
  // Gérer le défilement
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Détermine la direction du défilement
      if (currentScrollY > 20) { // Ignorer les petits mouvements
        const isDown = currentScrollY > lastScrollY;
        setIsScrollingDown(isDown);
      }
      
      // Sur la page d'accueil, on vérifie si on a défilé au-delà de 50px
      if (isHomePage) {
        setIsScrolled(currentScrollY > 50);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener("scroll", handleScroll);
    
    // Vérification initiale au chargement
    handleScroll();
    
    // Nettoie l'écouteur d'événement lors du démontage du composant
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage, lastScrollY]);
  
  // Configurer la zone de détection de la souris
  useEffect(() => {
    // Créer une zone de détection invisible en haut de l'écran
    const detectionArea = document.createElement('div');
    detectionArea.style.position = 'fixed';
    detectionArea.style.top = '0';
    detectionArea.style.left = '0';
    detectionArea.style.width = '100%';
    detectionArea.style.height = '20px'; // Zone de 20px en haut de l'écran
    detectionArea.style.zIndex = '40';
    detectionArea.style.pointerEvents = 'none'; // Ne pas interférer avec les interactions
    
    document.body.appendChild(detectionArea);
    mouseDetectionAreaRef.current = detectionArea;
    
    // Fonction de détection de la souris
    const handleMouseMove = (e) => {
      // Si la souris est près du haut de l'écran (moins de 60px depuis le haut)
      if (e.clientY < 60) {
        setIsMouseNear(true);
      } else if (e.clientY > 80 && !navbarRef.current?.contains(e.target)) {
        // Si la souris s'éloigne (plus de 80px) et n'est pas sur la navbar
        setIsMouseNear(false);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseDetectionAreaRef.current && document.body.contains(mouseDetectionAreaRef.current)) {
        document.body.removeChild(mouseDetectionAreaRef.current);
      }
    };
  }, []);
  
  // Ferme le menu mobile lors du changement de page
  useEffect(() => {
    setIsMenuOpen(false);
    setLastScrollY(0);
    setIsScrollingDown(false);
  }, [pathname]);
  
  // Détermine si la navbar doit être visible
  // Sur la page d'accueil: toujours visible, pas d'animation
  // Sur les autres pages: visible en haut, invisible en défilant vers le bas
  const shouldBeVisible = isHomePage 
    ? true 
    : (!isScrollingDown || lastScrollY < 50);
  
  // Force la navbar à être visible si le menu mobile est ouvert ou si la souris est proche
  const forceVisible = isMenuOpen || isMouseNear;
  
  return (
    <nav 
      ref={navbarRef}
      className={`flex flex-col md:flex-row items-center justify-between py-4 px-8 bg-background/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50
        ${isHomePage ? '' : 'transition-all duration-500'}
        ${shouldBeVisible || forceVisible ? 'translate-y-0' : 'translate-y-[-100%]'}
        ${(shouldBeVisible && !isHomePage) || forceVisible ? 'shadow-sm' : ''}
        ${isHomePage && isScrolled ? 'shadow-sm' : ''}
      `}
      onMouseEnter={() => setIsMouseNear(true)}
      onMouseLeave={() => setIsMouseNear(false)}
    >
      {/* En-tête de navigation avec logo et bouton menu */}
      <div className="flex w-full md:w-auto justify-between items-center">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image 
            src="/Logo HD.png" 
            alt="Still24 Logo" 
            width={200} 
            height={200}
            className="h-16 w-auto"
            priority
          />
        </Link>
        
        {/* Bouton menu hamburger - visible uniquement sur mobile */}
        <button 
          className="md:hidden flex flex-col space-y-1.5 p-2 rounded-md focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-space-indigo transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-space-indigo transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-space-indigo transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>
      </div>
      
      {/* Liens de navigation - affichage conditionnel sur mobile */}
      <div 
        className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:space-x-8 items-center space-y-4 md:space-y-0 w-full md:w-auto pt-4 md:pt-0 mt-4 md:mt-0 border-t md:border-t-0 border-slate-grey/20`}
      >
        {/* Liens dynamiques des galeries publiques */}
        {galleriesLoading ? (
          // Skeleton pendant le chargement
          <>
            <span className="w-12 h-4 bg-gray-200 rounded animate-pulse"></span>
            <span className="w-16 h-4 bg-gray-200 rounded animate-pulse"></span>
            <span className="w-14 h-4 bg-gray-200 rounded animate-pulse"></span>
          </>
        ) : (
          publicGalleries.map((gallery) => (
            <Link 
              key={gallery.id}
              href={`/gallery/${gallery.slug}`}
              className={`relative text-sm font-medium uppercase tracking-wider transition-colors ${
                pathname === `/gallery/${gallery.slug}` 
                  ? 'text-accent' 
                  : 'text-slate-grey hover:text-space-indigo'
              } after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-0.5 after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left ${
                pathname === `/gallery/${gallery.slug}` ? 'after:scale-x-100' : ''
              }`}
            >
              {gallery.name}
            </Link>
          ))
        )}
        
        {/* Lien vers toutes les galeries */}
        <Link 
          href="/galleries"
          className={`relative text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-1 ${
            pathname === '/galleries' 
              ? 'text-accent' 
              : 'text-slate-grey hover:text-space-indigo'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Toutes
        </Link>
        
        <Link 
          href="/bio"
          className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
            pathname === '/bio' 
              ? 'bg-accent text-white' 
              : 'bg-space-indigo text-white hover:bg-shadow-grey'
          }`}
        >
          À propos
        </Link>
        
        {/* Affichage conditionnel : UserMenu gère tout l'état (loading, auth, non-auth) */}
        <UserMenu />
      </div>
    </nav>
  );
};

export default Navbar;