"use client";

import React from 'react';
import Image from 'next/image';

export default function BioPage() {
  return (
    <div className="flex flex-col items-center px-6 py-12 mt-16 min-h-screen">
      <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-12 text-center text-black">Qui suis-je ?</h1>
      
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
        {/* Image section - occupe 2 colonnes sur écrans médium+ */}
        <div className="md:col-span-2">
          <div className="relative aspect-square w-full max-w-md mx-auto md:mx-0 overflow-hidden rounded-lg shadow-lg">
            <div className="bg-gray-200 w-full h-full flex items-center justify-center">      
              <Image 
                src="/portrait.jpg" 
                alt="Portrait du photographe" 
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
                priority
              /> 
              
            </div>
          </div>
        </div>
        
        {/* Bio section - occupe 3 colonnes sur écrans médium+ */}
        <div className="md:col-span-3 flex flex-col space-y-6 text-gray-700">
          <h2 className="text-2xl md:text-3xl font-semibold text-black">Photographe passionné</h2>
          
          <p>
            Moi, c'est Emilien, photographe amateur. 
            Ma passion pour la photographie a commencé grâce au club INTv et j'en suis maintenant fan.
          </p>
          
          <p>
            Mon approche photographique s'inspire de ce que je vois et qui me communique des émotions. 
            Je cherche à capturer la beauté de ce monde.
          </p>
          
          <p>
            À travers mes différentes collections - noir et blanc, scènes urbaines ou exploration - 
            je tente de partager ma vision du monde et les émotions que ces instants éphémères évoquent.
          </p>
          
          <h3 className="text-xl font-semibold text-black pt-4">Équipement</h3>
          <p>
            Je possède un Sony a6700,
            complété par un Sigma 18-50mm f/2.8.
          </p>
          
          <div className="pt-4">
            <h3 className="text-xl font-semibold text-black mb-2">Contact</h3>
            <p>
              Pour toute question :
              <br />
              <a href="mailto:efourgnier94370@gmail.com" className="text-blue-600 hover:underline">
                  efourgnier94370@gmail.com
              </a>
              <br />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}