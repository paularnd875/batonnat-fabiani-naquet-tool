'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  taille_cabinet?: string;
}

interface CabinetsTabProps {}

export default function CabinetsTab({}: CabinetsTabProps) {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const firmsPerPage = 50;

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadFirms = async () => {
    try {
      setLoading(true);
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

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Initialisation...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des cabinets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bouton de chargement */}
      {firms.length === 0 && !loading && (
        <div className="text-center">
          <button
            onClick={loadFirms}
            className="btn-fn-primary icon-hover focus-ring"
          >
            📋 Charger la liste des cabinets
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Cliquez pour charger et parcourir tous les cabinets d'avocats
          </p>
        </div>
      )}

      {/* Filtre simple pour la liste des cabinets */}
      {firms.length > 0 && (
        <div className="max-w-lg">
          <label htmlFor="cabinet-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Filtrer les cabinets
          </label>
          <Input
            id="cabinet-filter"
            type="text"
            placeholder="Nom du cabinet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fn-input focus-ring w-full"
          />
          {searchTerm && (
            <p className="text-sm text-blue-600 mt-1">
              {filteredFirms.length} résultat{filteredFirms.length > 1 ? 's' : ''} pour "{searchTerm}"
            </p>
          )}
        </div>
      )}

      {/* Label explicatif pour les pourcentages de participation */}
      {firms.length > 0 && (
        <div className="flex justify-end">
          <div className="text-sm font-bold text-blue-600">
            % participation
          </div>
        </div>
      )}

      {/* Grille de cabinets */}
      {firms.length > 0 && (
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
                  
                  {/* Badges de classification */}
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
      )}

      {/* Message si aucun résultat */}
      {filteredFirms.length === 0 && firms.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-fn-black mb-2">Aucun cabinet trouvé</h3>
          <p className="text-gray-500">
            Aucun résultat pour "{searchTerm}"
          </p>
        </div>
      )}

      {/* Pagination */}
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
    </div>
  );
}