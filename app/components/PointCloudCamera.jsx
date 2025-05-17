"use client";

import React, { useRef, useEffect } from "react";

export default function PointCloudCamera() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let angle = 0;
    
    // Configuration du canvas pour qu'il occupe tout l'espace
    const resizeCanvas = () => {
      const parentRect = canvas.parentElement.getBoundingClientRect();
      canvas.width = parentRect.width;
      canvas.height = parentRect.height;
    };
    
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    
    // Points de l'appareil photo (forme plus détaillée)
    const generateCameraPoints = () => {
      const points = [];
      const cameraWidth = Math.min(canvas.width * 0.4, 900);
      const cameraHeight = cameraWidth * 0.7;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 50; // Légèrement au-dessus du centre
      
      // Corps principal - centré sur l'origine pour rotation correcte
      for (let i = 0; i < 1300; i++) {
        // Position relative au centre (0,0,0) pour une rotation propre
        const offsetX = (Math.random() - 0.5) * cameraWidth;
        const offsetY = (Math.random() - 0.5) * cameraHeight;
        const offsetZ = (Math.random() - 0.5) * cameraWidth * 0.7;
        
        points.push({
          x: offsetX,                // Position relative
          y: offsetY,                // Position relative
          z: offsetZ,                // Position relative
          originX: centerX,          // Point d'origine pour le rendu final
          originY: centerY,          // Point d'origine pour le rendu final
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          color: Math.random() > 0.7 ? 'rgba(120, 120, 120, ' : 'rgba(80, 80, 80, '
        });
      }
      
      // Objectif (cercle de points) - décalé par rapport au centre du modèle
      const lensOffsetX = -cameraWidth * 0.25;  // Décalage relatif au centre
      for (let i = 0; i < 900; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (cameraWidth * 0.2);
        const depth = (Math.random() - 0.5) * (cameraWidth * 0.2);
        
        points.push({
          x: lensOffsetX + Math.cos(angle) * radius, // Position relative au centre du modèle
          y: Math.sin(angle) * radius,               // Position relative au centre du modèle
          z: depth,                                  // Position relative au centre du modèle
          originX: centerX,                          // Point d'origine pour le rendu final
          originY: centerY,                          // Point d'origine pour le rendu final
          size: Math.random() * 1.8 + 1,
          opacity: Math.random() * 0.6 + 0.4,
          color: Math.random() > 0.8 ? 'rgba(140, 140, 140, ' : 'rgba(100, 100, 100, '
        });
      }
      
      // Bouton déclencheur (petit groupe de points sur le dessus)
      const buttonOffsetX = cameraWidth * 0.15;    // Décalage relatif au centre
      const buttonOffsetY = -cameraHeight * 0.3;   // Décalage relatif au centre
      for (let i = 0; i < 250; i++) {
        points.push({
          x: buttonOffsetX + (Math.random() - 0.5) * cameraWidth * 0.1,  // Position relative au centre du modèle
          y: buttonOffsetY + (Math.random() - 0.5) * cameraHeight * 0.08, // Position relative au centre du modèle
          z: (Math.random() - 0.5) * cameraWidth * 0.1,                  // Position relative au centre du modèle
          originX: centerX,                                              // Point d'origine pour le rendu final
          originY: centerY,                                              // Point d'origine pour le rendu final
          size: Math.random() * 1.2 + 0.8,
          opacity: Math.random() * 0.7 + 0.3,
          color: 'rgba(130, 130, 130, '
        });
      }
      
      return points;
    };
    
    const cameraPoints = generateCameraPoints();
    
    // Animation du nuage de points avec rotation centrée
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mise à jour de l'angle de rotation
      angle += 0.01;
      
      // Trier les points par profondeur pour un effet 3D correct
      const sortedPoints = [...cameraPoints].sort((a, b) => {
        // Rotation 3D horizontale uniquement
        const rotatedZA = a.z * Math.cos(angle) - a.x * Math.sin(angle);
        const rotatedZB = b.z * Math.cos(angle) - b.x * Math.sin(angle);
        return rotatedZB - rotatedZA;
      });
      
      // Dessiner chaque point
      sortedPoints.forEach(point => {
        // Rotation 3D horizontale uniquement (autour de l'axe Y)
        const rotatedX = point.x * Math.cos(angle) + point.z * Math.sin(angle);
        const rotatedZ = point.z * Math.cos(angle) - point.x * Math.sin(angle);
        
        // Calculer la taille du point en fonction de sa profondeur
        const depth = (rotatedZ + canvas.width / 3) / (canvas.width / 1.5);
        const size = point.size * (1 + depth * 0.8);
        
        // Calculer l'opacité en fonction de la profondeur
        const opacity = point.opacity * (0.6 + depth * 0.4);
        
        // Dessiner le point en position absolue (origine + rotation)
        ctx.beginPath();
        ctx.arc(
          point.originX + rotatedX,  // Ajouter l'origine X à la position rotative
          point.originY + point.y,   // Ajouter l'origine Y à la position Y (pas de rotation verticale)
          size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `${point.color}${opacity})`;
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Démarrer l'animation
    animate();
    
    // Nettoyage lors du démontage du composant
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 opacity-40 pointer-events-none"
    />
  );
}