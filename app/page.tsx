'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface Firm {
  name: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  unclassified_count: number;
  participation_rate: number;
  assigned_count: number;
}

export default function Home() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const firmsPerPage = 50;

  useEffect(() => {
    loadFirms();
  }, []);

  const loadFirms = async () => {
    try {
      // Utilisons une API route plutôt qu'un accès direct Supabase côté client
      const response = await fetch('/api/firms');
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

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement des cabinets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header Fabiani-Naquet avec style Mondrian */}
      <FabianiNaquetHeader />
      
      {/* Contenu principal avec informations et recherche */}
      <div className="container mx-auto px-8 py-6">
        <div className="mb-6">
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">Descente de cabinet</span> • {firms.length} cabinets
            {searchTerm && (
              <span className="text-fn-blue"> • {filteredFirms.length} résultats pour "{searchTerm}"</span>
            )}
          </p>
        </div>

        {/* Barre de recherche et boutons */}
        <div className="flex gap-4 items-center flex-wrap mb-8">
          <div className="flex-1 min-w-[300px] max-w-lg">
            <input
              type="text"
              placeholder="Rechercher un cabinet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fn-input"
            />
          </div>
          <Link href="/test" className="btn-fn-outline">
            Test API
          </Link>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="container mx-auto px-8 pb-8">

        {/* Grille de cabinets avec style Fabiani-Naquet */}
        <div className="grid gap-6">
          {currentFirms.map((firm) => (
            <div key={firm.name} className="fn-card">
              <Link href={`/cabinet/${encodeURIComponent(firm.name)}`} className="block">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-fn-black mb-2">{firm.name}</h3>
                      <p className="text-gray-600 font-medium">
                        {firm.lawyer_count} avocat{firm.lawyer_count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      {firm.participation_rate !== null && firm.participation_rate !== undefined && (
                        <div className="text-2xl font-bold text-fn-blue">
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
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏮ Première
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            
            <div className="bg-white px-4 py-2 rounded-md border-2 border-gray-200 text-sm font-medium">
              <span className="text-fn-blue font-semibold">Page {currentPage}</span>
              <span className="text-gray-500"> sur {totalPages}</span>
              <div className="text-xs text-gray-400 mt-1">
                ({startIndex + 1}-{Math.min(endIndex, filteredFirms.length)} sur {filteredFirms.length} cabinets)
              </div>
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dernière ⏭
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
