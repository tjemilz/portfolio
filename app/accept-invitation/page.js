"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth, isAuthenticated } = useAuth();
  
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/galleries');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      await authApi.acceptInvitation({
        invitation_token: token,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });

      setSuccess(true);
      await checkAuth();

      setTimeout(() => {
        router.push('/galleries');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Lien invalide ou expiré.');
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-sm shadow-sm border border-slate-grey/10 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-space-indigo mb-2">Jeton d'invitation manquant</h1>
          <p className="text-slate-grey text-sm mb-6">
            Ce lien est incomplet. Veuillez cliquer sur le lien d'invitation complet qui vous a été transmis.
          </p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-6 bg-space-indigo text-white rounded-sm text-sm hover:bg-shadow-grey transition-colors"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl text-space-indigo">Still24</span>
          </Link>
          <h1 className="mt-6 font-serif text-2xl text-space-indigo">
            Activation de votre compte
          </h1>
          <p className="mt-2 text-slate-grey font-light text-sm">
            Définissez votre mot de passe pour accéder à vos galeries privées.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-grey/10">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-xl text-space-indigo mb-2">Compte activé !</h2>
              <p className="text-slate-grey text-sm">
                Redirection en cours vers vos galeries privées...
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-sm">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="first_name" className="block text-xs font-medium text-shadow-grey mb-1.5 uppercase tracking-wider">
                    Prénom
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    className="w-full px-3.5 py-2.5 border border-slate-grey/20 rounded-sm text-space-indigo placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm transition-colors"
                    placeholder="Jean"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-xs font-medium text-shadow-grey mb-1.5 uppercase tracking-wider">
                    Nom
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    className="w-full px-3.5 py-2.5 border border-slate-grey/20 rounded-sm text-space-indigo placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm transition-colors"
                    placeholder="Dupont"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-shadow-grey mb-1.5 uppercase tracking-wider">
                  Mot de passe (8 car. min)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 border border-slate-grey/20 rounded-sm text-space-indigo placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm transition-colors"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password_confirm" className="block text-xs font-medium text-shadow-grey mb-1.5 uppercase tracking-wider">
                  Confirmer le mot de passe
                </label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 border border-slate-grey/20 rounded-sm text-space-indigo placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm transition-colors"
                  placeholder="••••••••"
                  value={formData.password_confirm}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-space-indigo text-white rounded-sm font-medium hover:bg-shadow-grey focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm mt-2"
              >
                {loading ? 'Activation en cours...' : 'Activer mon accès'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/login" 
            className="text-xs text-slate-grey hover:text-accent transition-colors"
          >
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></div>
      </div>
    }>
      <AcceptInvitationForm />
    </Suspense>
  );
}
