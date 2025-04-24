"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const Navbar = () => {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomePage = pathname === '/';
  
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
  
  // Ferme le menu mobile lors du changement de page
  useEffect(() => {
    setIsMenuOpen(false);
    setLastScrollY(0);
    setIsScrollingDown(false);
  }, [pathname]);
  
  // Détermine si la navbar doit être visible
  const shouldBeVisible = isHomePage 
    ? isScrolled // Sur la page d'accueil: invisible en haut, visible en défilant
    : (!isScrollingDown || lastScrollY < 50); // Sur les autres pages: visible en haut, invisible en défilant vers le bas
  
  // Force la navbar à être visible si le menu mobile est ouvert
  const forceVisible = isMenuOpen;
  
  return (
    <nav 
      className={`flex flex-col md:flex-row items-center justify-between py-4 px-6 bg-white fixed top-0 left-0 right-0 z-50 transition-transform duration-300
        ${shouldBeVisible || forceVisible ? 'translate-y-0' : 'translate-y-[-100%] pointer-events-none'}
        ${(shouldBeVisible && !isHomePage) || forceVisible ? 'shadow-md' : ''}
        ${isHomePage && isScrolled ? 'shadow-md' : ''}
      `}
    >
      {/* En-tête de navigation avec logo et bouton menu */}
      <div className="flex w-full md:w-auto justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors">
          My Portfolio
        </Link>
        
        {/* Bouton menu hamburger - visible uniquement sur mobile */}
        <button 
          className="md:hidden flex flex-col space-y-1.5 p-2 rounded-md focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-gray-800 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>
      </div>
      
      {/* Liens de navigation - affichage conditionnel sur mobile */}
      <div 
        className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:space-x-6 items-center space-y-4 md:space-y-0 w-full md:w-auto pt-4 md:pt-0 mt-4 md:mt-0 border-t md:border-t-0 border-gray-200`}
      >
        <Link 
          href="/bw" 
          className={`${pathname === '/bw' ? 'text-blue-600 font-medium' : 'text-gray-600'} hover:text-blue-500 transition-colors`}
        >
          B&W
        </Link>
        <Link 
          href="/explore" 
          className={`${pathname === '/explore' ? 'text-blue-600 font-medium' : 'text-gray-600'} hover:text-blue-500 transition-colors`}
        >
          Explore
        </Link>
        <Link 
          href="/streets" 
          className={`${pathname === '/streets' ? 'text-blue-600 font-medium' : 'text-gray-600'} hover:text-blue-500 transition-colors`}
        >
          Streets
        </Link>
        <Link 
          href="/bio"
          className={`bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors ${
            pathname === '/bio' ? 'bg-blue-600 hover:bg-blue-700' : ''
          }`}
        >
          À propos
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;