'use client';

import { useState, useEffect } from 'react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';
import LawyersTab from '@/components/LawyersTab';

export default function AvocatsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        <FabianiNaquetHeader />
        <div className="container mx-auto p-8">
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
      
      <div className="container mx-auto px-8 py-6">
        {/* En-tête de la page Avocats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fn-black mb-2" style={{ fontFamily: "var(--font-resolve)" }}>
            👥 AVOCATS
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">Base de données complète</span> • Recherche et filtres avancés
          </p>
        </div>

        {/* Contenu principal - Composant LawyersTab */}
        <main>
          <LawyersTab />
        </main>
      </div>
    </div>
  );
}