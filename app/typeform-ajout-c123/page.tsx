'use client';

import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

export default function TypeformAjoutC123Page() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger le script Typeform si ce n'est pas déjà fait
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header Fabiani-Naquet */}
      <FabianiNaquetHeader />
      
      {/* Contenu principal */}
      <div className="container mx-auto px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fn-black mb-4">
            Ajout C123
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            <span className="decorative-text">Formulaire de classification</span> • 
            Ajoutez ou modifiez les classifications des avocats
          </p>
          
          {/* Informations utiles */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
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
        </div>

        {/* Conteneur pour le Typeform */}
        <div className="fn-card relative">
          <div className="p-8">
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Chargement du formulaire...</p>
                </div>
              </div>
            )}
            
            {/* Typeform embed */}
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

        {/* Instructions d'utilisation */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-fn-black mb-3">
            Instructions d'utilisation
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">1.</span>
              Remplissez tous les champs obligatoires du formulaire
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">2.</span>
              Sélectionnez la classification appropriée (C1, C2, C3, BL, SP)
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">3.</span>
              Vérifiez vos informations avant de soumettre
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">4.</span>
              Les données seront automatiquement intégrées au système
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}