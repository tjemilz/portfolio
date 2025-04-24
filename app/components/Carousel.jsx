"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Carousel = ({ children: slides }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const prev = () =>
    setCurrentImageIndex((currentImageIndex) =>
      currentImageIndex === 0 ? slides.length - 1 : currentImageIndex - 1
    );
  const next = () =>
    setCurrentImageIndex((currentImageIndex) =>
      currentImageIndex === slides.length - 1 ? 0 : currentImageIndex + 1
    );

  return (
    <div className="overflow-hidden relative flex justify-center items-center w-full max-w-4xl"> 
      <div
        className="flex transition-transform ease-out duration-500 w-full"
        style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
      >
        {slides}
      </div>
      <div className="absolute inset-0 flex items-center justify-between p-4">
        <button
          onClick={prev}
          className="p-1 rounded-full bg-white/70 shadow text-gray-800 hover:bg-white"
        >
          <ChevronLeft size={30} />
        </button>
        <button
          onClick={next}
          className="p-1 rounded-full bg-white/70 shadow text-gray-800 hover:bg-white"
        >
          <ChevronRight size={30} />
        </button>
      </div>
    </div>
  );
};

export default Carousel;