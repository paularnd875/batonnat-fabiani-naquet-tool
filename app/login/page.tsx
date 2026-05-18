'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Veuillez saisir le mot de passe');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Rediriger vers la page d'accueil après connexion réussie
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Mot de passe incorrect');
      }
    } catch (error) {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Header avec style Fabiani-Naquet */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <div 
              className="text-lg sm:text-2xl font-bold text-black uppercase tracking-wide px-2"
              style={{ fontFamily: "var(--font-resolve)" }}
            >
              BÂTONNAT FABIANI-NAQUET 2026
            </div>
            {/* Bande de couleurs Mondrian */}
            <div className="flex h-1 mt-3 sm:mt-4 mx-4 sm:mx-8">
              <div className="flex-1 bg-blue-600"></div>
              <div className="flex-1 bg-white"></div>
              <div className="flex-1 bg-yellow-400"></div>
              <div className="flex-1 bg-red-600"></div>
              <div className="flex-1 bg-black"></div>
            </div>
          </div>
          
          <h1 className="text-lg sm:text-xl font-semibold text-fn-black mb-2">
            Accès sécurisé
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Veuillez saisir le mot de passe pour accéder à la plateforme
          </p>
        </div>

        {/* Formulaire de connexion */}
        <div className="fn-card">
          <div className="p-4 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-fn-black mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Saisir le mot de passe..."
                    className="fn-input pl-10 pr-12"
                    disabled={isLoading}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Lock className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-fn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Note de sécurité */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Accès réservé aux membres autorisés du Bâtonnat Fabiani-Naquet 2026
          </p>
        </div>
      </div>
    </div>
  );
}