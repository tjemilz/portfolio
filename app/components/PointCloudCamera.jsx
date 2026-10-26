"use client";

import React, { useRef, useEffect } from "react";

export default function PointCloudCamera() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId = null;
    let isVisible = true;
    let angle = 0;
    
    // Check if device is mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Configuration du canvas
    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      const parentRect = canvas.parentElement.getBoundingClientRect();
      canvas.width = parentRect.width;
      canvas.height = parentRect.height;
    };
    
    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();
    
    // Generate camera points with density adjusted for mobile vs desktop
    const generateCameraPoints = () => {
      const points = [];
      const cameraWidth = Math.min(canvas.width * (isMobile ? 0.6 : 0.4), 900);
      const cameraHeight = cameraWidth * 0.7;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - (isMobile ? 20 : 50);
      
      // Dramatic reduction on mobile (120 vs 800) for silky smooth performance & zero battery drain
      const bodyCount = isMobile ? 120 : 700;
      const lensCount = isMobile ? 60 : 400;
      const buttonCount = isMobile ? 20 : 100;

      // Corps principal
      for (let i = 0; i < bodyCount; i++) {
        const offsetX = (Math.random() - 0.5) * cameraWidth;
        const offsetY = (Math.random() - 0.5) * cameraHeight;
        const offsetZ = (Math.random() - 0.5) * cameraWidth * 0.7;
        
        points.push({
          x: offsetX,
          y: offsetY,
          z: offsetZ,
          originX: centerX,
          originY: centerY,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.2,
          color: Math.random() > 0.7 ? 'rgba(120, 120, 120, ' : 'rgba(80, 80, 80, '
        });
      }
      
      // Objectif
      const lensOffsetX = -cameraWidth * 0.25;
      for (let i = 0; i < lensCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const radius = Math.random() * (cameraWidth * 0.2);
        const depth = (Math.random() - 0.5) * (cameraWidth * 0.2);
        
        points.push({
          x: lensOffsetX + Math.cos(a) * radius,
          y: Math.sin(a) * radius,
          z: depth,
          originX: centerX,
          originY: centerY,
          size: Math.random() * 1.8 + 1,
          opacity: Math.random() * 0.5 + 0.3,
          color: Math.random() > 0.8 ? 'rgba(140, 140, 140, ' : 'rgba(100, 100, 100, '
        });
      }
      
      // Déclencheur
      const buttonOffsetX = cameraWidth * 0.15;
      const buttonOffsetY = -cameraHeight * 0.3;
      for (let i = 0; i < buttonCount; i++) {
        points.push({
          x: buttonOffsetX + (Math.random() - 0.5) * cameraWidth * 0.1,
          y: buttonOffsetY + (Math.random() - 0.5) * cameraHeight * 0.08,
          z: (Math.random() - 0.5) * cameraWidth * 0.1,
          originX: centerX,
          originY: centerY,
          size: Math.random() * 1.2 + 0.8,
          opacity: Math.random() * 0.6 + 0.2,
          color: 'rgba(130, 130, 130, '
        });
      }
      
      return points;
    };
    
    const cameraPoints = generateCameraPoints();
    const halfWidth = canvas.width / 1.5;
    const thirdWidth = canvas.width / 3;

    // Optimized render loop without sorting overhead
    const animate = () => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += isMobile ? 0.007 : 0.01;
      
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Single pass render
      for (let i = 0; i < cameraPoints.length; i++) {
        const point = cameraPoints[i];
        const rotatedX = point.x * cosA + point.z * sinA;
        const rotatedZ = point.z * cosA - point.x * sinA;
        
        const depth = (rotatedZ + thirdWidth) / halfWidth;
        const size = point.size * (1 + depth * 0.7);
        const opacity = point.opacity * (0.6 + depth * 0.4);
        
        ctx.beginPath();
        ctx.arc(
          point.originX + rotatedX,
          point.originY + point.y,
          size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `${point.color}${opacity})`;
        ctx.fill();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Pause when hero is out of view (saves 100% CPU when scrolling down)
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && !document.hidden;
      if (isVisible) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    }, { threshold: 0.05 });

    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    // Pause when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        isVisible = true;
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial start
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
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