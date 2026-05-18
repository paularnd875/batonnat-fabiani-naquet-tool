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
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false); // Début avec false pour éviter l'hydratation error
  const [mounted, setMounted] = useState(false); // État pour gérer l'hydratation
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const firmsPerPage = 50;
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    setMounted(true); // Marquer comme monté côté client
    // 🚀 OPTIMISATION: Ne plus charger automatiquement tous les cabinets au démarrage
    // Ils seront chargés uniquement quand l'utilisateur fait défiler ou filtre
  }, []);

  const loadFirms = async () => {
    try {
      // Utilisons la nouvelle API qui lit directement depuis Google Sheets pour avoir les vraies stats
      const response = await fetch('/api/firms-live');
      const data = await response.json();
      
      if (data.success) {
        setFirms(data.firms || []);
      } else {
        console.error('Erreur API:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement cabinets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFirms = firms.filter(firm => 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredFirms.length / firmsPerPage);
  const startIndex = (currentPage - 1) * firmsPerPage;
  const endIndex = startIndex + firmsPerPage;
  const currentFirms = filteredFirms.slice(startIndex, endIndex);

  // Reset page lors d'une recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatClassementBadge = (type: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      C1: 'bg-green-600 text-white',
      C2: 'bg-green-400 text-white', 
      C3: 'bg-yellow-500 text-white',
      BL: 'bg-red-600 text-white'
    };

    return (
      <Badge className={variants[type as keyof typeof variants]}>
        {type}: {count}
      </Badge>
    );
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        <FabianiNaquetHeader />
        <div className="container mx-auto p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Chargement des cabinets...</div>
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
              RECHERCHE AVOCATS & CABINETS
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              <span className="decorative-text">Descente de cabinet</span> • {firms.length} cabinets
              {searchTerm && (
                <span className="text-blue-600"> • {filteredFirms.length} résultats pour "{searchTerm}"</span>
              )}
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
              <p className="text-sm text-gray-500">Recherchez parmi tous les avocats et cabinets</p>
            </div>
            <SearchBar 
              onSearchResults={setSearchResults}
              showDropdown={false}
            />
          </div>
        </div>

        {/* Séparateur visuel */}
        {!searchResults && (
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm font-medium text-gray-500 px-4 bg-gray-50 rounded-full">
              OU PARCOURIR LES CABINETS
            </span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
        )}

        {/* Chargement à la demande des cabinets */}
        {!searchResults && firms.length === 0 && !loading && (
          <div className="mb-8 text-center">
            <button
              onClick={() => {
                setLoading(true);
                loadFirms();
              }}
              className="btn-fn-primary icon-hover focus-ring"
            >
              📋 Charger la liste des cabinets
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Cliquez pour charger et parcourir tous les cabinets d'avocats
            </p>
          </div>
        )}

        {/* Filtre simple pour la liste des cabinets (seulement si cabinets chargés et pas de résultats de recherche) */}
        {!searchResults && firms.length > 0 && (
          <div className="mb-8">
            <div className="max-w-lg">
              <label htmlFor="cabinet-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrer la liste des cabinets ci-dessous
              </label>
              <input
                id="cabinet-filter"
                type="text"
                placeholder="Nom du cabinet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="fn-input focus-ring w-full"
              />
            </div>
          </div>
        )}
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
          <>
            {/* Label explicatif pour les pourcentages de participation */}
            <div className="flex justify-end mb-4">
              <div className="text-sm font-bold text-blue-600">
                % participation
              </div>
            </div>

            {/* Grille de cabinets avec style Fabiani-Naquet */}
            <div className="grid gap-6">
              {currentFirms.map((firm) => (
            <div key={firm.name} className="fn-card">
              <Link href={`/cabinet/${encodeURIComponent(firm.name)}`} className="fn-link block focus-ring">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-fn-black mb-2 text-balance">{firm.name}</h3>
                      <p className="text-gray-600 font-medium">
                        {firm.lawyer_count} avocat{firm.lawyer_count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      {firm.participation_rate !== null && firm.participation_rate !== undefined && (
                        <div className="text-2xl font-bold text-blue-600 stats-numbers">
                          {(firm.participation_rate * 100).toFixed(1)}%
                        </div>
                      )}
                      {firm.assigned_count > 0 && (
                        <div className="fn-badge fn-badge-outline text-xs">
                          {firm.assigned_count} assigné{firm.assigned_count > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Badges de classification avec nouveau style */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {firm.soutien_public_count > 0 && (
                      <span className="fn-badge fn-badge-sp">
                        Soutien public: {firm.soutien_public_count}
                      </span>
                    )}
                    {firm.c1_count > 0 && (
                      <span className="fn-badge fn-badge-c1">
                        C1: {firm.c1_count}
                      </span>
                    )}
                    {firm.c2_count > 0 && (
                      <span className="fn-badge fn-badge-c2">
                        C2: {firm.c2_count}
                      </span>
                    )}
                    {firm.c3_count > 0 && (
                      <span className="fn-badge fn-badge-c3">
                        C3: {firm.c3_count}
                      </span>
                    )}
                    {firm.bl_count > 0 && (
                      <span className="fn-badge fn-badge-bl">
                        BL: {firm.bl_count}
                      </span>
                    )}
                    {firm.unclassified_count > 0 && (
                      <span className="fn-badge" style={{backgroundColor: 'var(--fn-gray-medium)', color: 'var(--fn-white)'}}>
                        Non classés: {firm.unclassified_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
            </div>

            {/* Message si aucun résultat */}
            {filteredFirms.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-fn-black mb-2">Aucun cabinet trouvé</h3>
                <p className="text-gray-500">
                  {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun cabinet disponible'}
                </p>
              </div>
            )}

            {/* Pagination avec style Fabiani-Naquet */}
            {totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-3">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
            >
              ⏮ Première
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
            >
              ← Précédent
            </button>
            
            <div className="bg-white px-4 py-2 rounded-md border-2 border-gray-200 text-sm font-medium">
              <span className="text-blue-600 font-semibold">Page {currentPage}</span>
              <span className="text-gray-500"> sur {totalPages}</span>
              <div className="text-xs text-gray-400 mt-1">
                ({startIndex + 1}-{Math.min(endIndex, filteredFirms.length)} sur {filteredFirms.length} cabinets)
              </div>
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
            >
              Suivant →
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
            >
              Dernière ⏭
            </button>
            </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
