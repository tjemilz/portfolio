"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function BioPage() {

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <span className="text-accent text-sm tracking-[0.3em] uppercase font-medium">
              À propos
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-7xl lg:text-8xl text-space-indigo">
              Qui suis-je ?
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Image */}
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
                <Image 
                  src="/portrait.jpg" 
                  alt="Portrait du photographe" 
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover image-hover"
                  priority
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border border-accent/30 rounded-sm -z-10"></div>
            </div>
            
            {/* Text Content */}
            <div className="lg:pt-12">
              <h2 className="font-serif text-3xl md:text-4xl text-space-indigo mb-8">
                Photographe passionné
              </h2>
              
              <div className="space-y-6 text-slate-grey font-light leading-relaxed">
                <p>
                  Moi, c'est <span className="text-accent font-medium">Emilien</span>, photographe amateur. 
                  Ma passion pour la photographie a commencé grâce au club INTv et j'en suis maintenant fan.
                </p>
                
                <p>
                  Mon approche photographique s'inspire de ce que je vois et qui me communique des émotions. 
                  Je cherche à capturer la <span className="text-space-indigo font-medium">beauté de ce monde</span>.
                </p>
                
                <p>
                  À travers mes différentes collections — noir et blanc, scènes urbaines ou exploration — 
                  je tente de partager ma vision du monde et les émotions que ces instants éphémères évoquent.
                </p>
              </div>

              {/* Quote */}
              <blockquote className="mt-12 pl-6 border-l-2 border-accent">
                <p className="font-serif text-xl text-shadow-grey italic">
                  "La photographie est une brève complicité entre la prévoyance et le hasard."
                </p>
                <cite className="mt-3 block text-sm text-slate-grey not-italic">
                  — John Stuart Mill
                </cite>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Line */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-grey/30 to-transparent"></div>
      </div>

      {/* Equipment Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <span className="text-accent text-sm tracking-[0.2em] uppercase font-medium">
                Équipement
              </span>
              <h3 className="mt-4 font-serif text-3xl text-space-indigo">
                Mes outils de création
              </h3>
              <p className="mt-6 text-slate-grey font-light leading-relaxed">
                Un bon équipement ne fait pas le photographe, mais il permet d'exprimer pleinement sa vision. 
                Voici ce qui m'accompagne sur le terrain.
              </p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-space-indigo">Sony a6700</h4>
                  <p className="mt-1 text-sm text-slate-grey font-light">
                    Boîtier hybride APS-C, 26MP, stabilisation 5 axes
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-space-indigo">Sigma 18-50mm f/2.8</h4>
                  <p className="mt-1 text-sm text-slate-grey font-light">
                    Objectif zoom polyvalent, ouverture constante
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-6 bg-space-indigo text-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-accent text-sm tracking-[0.3em] uppercase">Contact</span>
          <h3 className="mt-4 font-serif text-3xl md:text-4xl text-white">
            Travaillons ensemble
          </h3>
          <p className="mt-6 text-slate-grey max-w-xl mx-auto font-light">
            Pour toute question, collaboration ou simplement pour échanger autour de la photographie, 
            n'hésitez pas à me contacter.
          </p>
          
          <a 
            href="mailto:efourgnier94370@gmail.com" 
            className="inline-flex items-center gap-3 mt-10 px-8 py-4 bg-accent text-white rounded-full hover:bg-accent-hover transition-all duration-300 group"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            efourgnier94370@gmail.com
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          {/* Social Links */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-accent transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-accent transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-accent transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* CTA to Galleries */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-grey font-light">Envie de découvrir mon travail ?</p>
          <Link
            href="/galleries"
            className="inline-flex items-center gap-3 mt-4 text-space-indigo hover:text-accent transition-colors group"
          >
            <span className="font-serif text-xl">Explorer les galeries</span>
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}