'use client';

import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

export default function TypeformAjoutC123Page() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Charger le script Typeform de manière contrôlée
    const existingScript = document.querySelector('script[src="//embed.typeform.com/next/embed.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = '//embed.typeform.com/next/embed.js';
      script.async = true;
      
      script.onload = () => {
        setTimeout(() => setIsLoading(false), 1000);
      };
      
      document.body.appendChild(script);
    } else {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        <FabianiNaquetHeader />
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Initialisation...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto px-8 py-8 max-w-6xl">
        {/* En-tête de la page */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fn-black mb-2" style={{ fontFamily: "var(--font-resolve)" }}>
            📝 AJOUT C123
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">Formulaire de classification</span> • Ajoutez ou modifiez les classifications des avocats
          </p>
        </div>

        {/* Informations utiles */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Classifications disponibles :</strong> C1 (Excellente), C2 (Bonne), C3 (Moyenne), BL (Blacklist), SP (Soutien Public)
              </p>
            </div>
          </div>
        </div>

        {/* Conteneur principal pour le Typeform */}
        <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm overflow-hidden mx-auto" style={{ maxWidth: '900px' }}>
          <div className="p-6 relative">
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Chargement du formulaire...</p>
                </div>
              </div>
            )}
            
            {/* Typeform embed avec protection CSS */}
            <div 
              className="w-full"
              style={{
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <style jsx>{`
                [data-tf-live="01KREG2RJ52Y008JET5FRQ2X71"] {
                  width: 100% !important;
                  margin: 0 auto !important;
                  position: relative !important;
                  left: 0 !important;
                  right: 0 !important;
                  transform: none !important;
                }
                [data-tf-live="01KREG2RJ52Y008JET5FRQ2X71"] * {
                  margin-left: 0 !important;
                  margin-right: 0 !important;
                }
              `}</style>
              <div 
                data-tf-live="01KREG2RJ52Y008JET5FRQ2X71"
                style={{ 
                  width: '100%',
                  height: '700px',
                  minHeight: '600px',
                  border: 'none',
                  borderRadius: '8px'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Instructions d'utilisation */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4" style={{ fontFamily: "var(--font-resolve)" }}>
            🔍 INSTRUCTIONS D'UTILISATION
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-3">1.</span>
              Remplissez tous les champs obligatoires du formulaire
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-3">2.</span>
              Sélectionnez la classification appropriée (C1, C2, C3, BL, SP)
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-3">3.</span>
              Vérifiez vos informations avant de soumettre
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-3">4.</span>
              Les données seront automatiquement intégrées au système
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}