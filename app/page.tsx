'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import IntelligentPreloader from '@/components/IntelligentPreloader';
import CabinetsTab from '@/components/CabinetsTab';

interface Firm {
  name: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  soutien_public_count: number;
  unclassified_count: number;
  participation_rate: number;
  assigned_count: number;
}

interface SearchResults {
  lawyers: any[];
  cabinets: any[];
  query: string;
  totalFound: number;
  searchTime: number;
  totalLawyersFound?: number;
  totalCabinetsFound?: number;
}

export default function Home() {
  const [mounted, setMounted] = useState(false); // État pour gérer l'hydratation
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    setMounted(true); // Marquer comme monté côté client
  }, []);

  // Éviter l'hydratation error en gérant l'état de chargement différemment
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
      {/* 🚀 Système de pré-chargement intelligent */}
      <IntelligentPreloader />
      
      {/* Header Fabiani-Naquet avec style Mondrian */}
      <FabianiNaquetHeader />
      
      {/* Contenu principal avec informations et recherche */}
      <div className="container mx-auto px-8 py-6">
        {/* En-tête avec informations et action principale */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-fn-black mb-2" style={{ fontFamily: "var(--font-resolve)" }}>
              📋 CABINETS D'AVOCATS
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              <span className="decorative-text">Descente de cabinet</span> • Données à jour
            </p>
          </div>
          <Link href="/team/add" className="btn-fn-primary icon-hover">
            Ajouter un collaborateur
          </Link>
        </div>

        {/* Recherche globale intelligente */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-800" style={{ fontFamily: "var(--font-resolve)" }}>
                🔍 RECHERCHE INTELLIGENTE
              </h2>
              <p className="text-sm text-gray-500">Recherchez parmi tous les cabinets d'avocats</p>
            </div>
            <SearchBar 
              onSearchResults={setSearchResults}
              showDropdown={false}
              searchType="cabinets"
            />
          </div>
        </div>


      </div>

      {/* Contenu principal */}
      <main className="container mx-auto px-8 pb-8">
        
        {/* Affichage conditionnel : résultats de recherche OU liste des cabinets */}
        {searchResults ? (
          <SearchResults 
            results={searchResults}
            onClear={() => setSearchResults(null)}
          />
        ) : (
          <CabinetsTab />
        )}
      </main>
    </div>
  );
}
