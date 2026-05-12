'use client';

import { useState, useEffect } from 'react';
import { User, Building2, Shield, Award, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Lawyer {
  prenomnom: string;
  nom_complet: string;
  civilite: string;
  cabinet: string;
  email: string;
  photo_url?: string;
  specialisations?: string[];
  classement: string;
  soutien_public: boolean;
  statut_cabinet?: string;
}

interface Cabinet {
  name: string;
  originalName: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  soutien_public_count: number;
  sample_lawyers: Array<{nom_complet: string; prenomnom: string}>;
}

interface SearchResults {
  lawyers: Lawyer[];
  cabinets: Cabinet[];
  query: string;
  totalFound: number;
  searchTime: number;
  totalLawyersFound?: number;
  totalCabinetsFound?: number;
}

interface SearchResultsProps {
  results: SearchResults;
  onClear: () => void;
}

export default function SearchResults({ results, onClear }: SearchResultsProps) {
  // États pour la pagination
  const [currentPageLawyers, setCurrentPageLawyers] = useState(1);
  const [currentPageCabinets, setCurrentPageCabinets] = useState(1);
  const itemsPerPage = 20; // 20 résultats par page pour optimiser le chargement

  // Reset pagination when results change
  useEffect(() => {
    setCurrentPageLawyers(1);
    setCurrentPageCabinets(1);
  }, [results.query, results.totalFound]);

  const getClassementBadge = (classement: string) => {
    const badges = {
      'C1': 'fn-badge fn-badge-c1',
      'C2': 'fn-badge fn-badge-c2', 
      'C3': 'fn-badge fn-badge-c3',
      'Blacklist': 'fn-badge fn-badge-bl'
    };
    return badges[classement as keyof typeof badges] || '';
  };

  // Calculs de pagination pour les avocats
  const totalPagesLawyers = Math.ceil(results.lawyers.length / itemsPerPage);
  const startIndexLawyers = (currentPageLawyers - 1) * itemsPerPage;
  const endIndexLawyers = startIndexLawyers + itemsPerPage;
  const currentLawyers = results.lawyers.slice(startIndexLawyers, endIndexLawyers);

  // Calculs de pagination pour les cabinets
  const totalPagesCabinets = Math.ceil(results.cabinets.length / itemsPerPage);
  const startIndexCabinets = (currentPageCabinets - 1) * itemsPerPage;
  const endIndexCabinets = startIndexCabinets + itemsPerPage;
  const currentCabinets = results.cabinets.slice(startIndexCabinets, endIndexCabinets);

  return (
    <div className="space-y-6">
      {/* En-tête des résultats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-fn-black">
            Résultats de recherche
          </h2>
          <p className="text-gray-600 mt-1">
            {results.totalFound} résultat{results.totalFound > 1 ? 's' : ''} 
            {results.query && ` pour "${results.query}"`} 
            <span className="text-gray-400 ml-2">({results.searchTime}ms)</span>
          </p>
        </div>
        <button
          onClick={onClear}
          className="btn-fn-outline text-sm"
        >
          Effacer la recherche
        </button>
      </div>

      {/* Résultats des cabinets */}
      {results.cabinets.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-fn-black mb-4">
            <Building2 className="h-5 w-5" />
            Cabinets ({results.cabinets.length}
            {results.totalCabinetsFound && results.totalCabinetsFound > results.cabinets.length && 
              <span className="text-gray-500"> sur {results.totalCabinetsFound} trouvés</span>
            })
            {totalPagesCabinets > 1 && (
              <span className="text-sm text-gray-500 ml-2">
                - Page {currentPageCabinets}/{totalPagesCabinets}
              </span>
            )}
          </h3>
          <div className="grid gap-6">
            {currentCabinets.map((cabinet, index) => (
              <div key={index} className="fn-card">
                <Link href={`/cabinet/${encodeURIComponent(cabinet.originalName)}`} className="fn-link block focus-ring">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-fn-black mb-2 text-balance">
                          {cabinet.name}
                        </h4>
                        <p className="text-gray-600 font-medium">
                          {cabinet.lawyer_count} avocat{cabinet.lawyer_count > 1 ? 's' : ''}
                        </p>
                        {cabinet.sample_lawyers.length > 0 && (
                          <p className="text-sm text-gray-500 mt-2">
                            Ex: {cabinet.sample_lawyers.map(l => l.nom_complet || l.prenomnom).slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges de classification */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {cabinet.soutien_public_count > 0 && (
                        <span className="fn-badge fn-badge-sp">
                          Soutien public: {cabinet.soutien_public_count}
                        </span>
                      )}
                      {cabinet.c1_count > 0 && (
                        <span className="fn-badge fn-badge-c1">
                          C1: {cabinet.c1_count}
                        </span>
                      )}
                      {cabinet.c2_count > 0 && (
                        <span className="fn-badge fn-badge-c2">
                          C2: {cabinet.c2_count}
                        </span>
                      )}
                      {cabinet.c3_count > 0 && (
                        <span className="fn-badge fn-badge-c3">
                          C3: {cabinet.c3_count}
                        </span>
                      )}
                      {cabinet.bl_count > 0 && (
                        <span className="fn-badge fn-badge-bl">
                          BL: {cabinet.bl_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {/* Pagination des cabinets */}
          {totalPagesCabinets > 1 && (
            <div className="mt-8 flex justify-center items-center gap-3">
              <button
                onClick={() => setCurrentPageCabinets(1)}
                disabled={currentPageCabinets === 1}
                className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏮ Première
              </button>
              
              <button
                onClick={() => setCurrentPageCabinets(prev => Math.max(prev - 1, 1))}
                disabled={currentPageCabinets === 1}
                className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </button>
              
              <div className="bg-white px-4 py-2 rounded-md border-2 border-gray-200 text-sm font-medium">
                <span className="text-blue-600 font-semibold">Page {currentPageCabinets}</span>
                <span className="text-gray-500"> sur {totalPagesCabinets}</span>
                <div className="text-xs text-gray-400 mt-1">
                  ({startIndexCabinets + 1}-{Math.min(endIndexCabinets, results.cabinets.length)} sur {results.cabinets.length} cabinets)
                </div>
              </div>
              
              <button
                onClick={() => setCurrentPageCabinets(prev => Math.min(prev + 1, totalPagesCabinets))}
                disabled={currentPageCabinets === totalPagesCabinets}
                className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
              
              <button
                onClick={() => setCurrentPageCabinets(totalPagesCabinets)}
                disabled={currentPageCabinets === totalPagesCabinets}
                className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dernière ⏭
              </button>
            </div>
          )}
        </section>
      )}

      {/* Résultats des avocats */}
      {results.lawyers.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-fn-black mb-4">
            <User className="h-5 w-5" />
            Avocats ({results.lawyers.length}
            {results.totalLawyersFound && results.totalLawyersFound > results.lawyers.length && 
              <span className="text-gray-500"> sur {results.totalLawyersFound} trouvés</span>
            })
            {totalPagesLawyers > 1 && (
              <span className="text-sm text-gray-500 ml-2">
                - Page {currentPageLawyers}/{totalPagesLawyers}
              </span>
            )}
          </h3>
          <div className="grid gap-4">
            {currentLawyers.map((lawyer, index) => (
              <div key={index} className="fn-card">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {lawyer.photo_url ? (
                        <img
                          src={lawyer.photo_url}
                          alt={lawyer.nom_complet}
                          className="w-16 h-16 rounded-full object-cover bg-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Informations */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-fn-black text-lg truncate">
                          {lawyer.nom_complet || lawyer.prenomnom}
                        </h4>
                        {lawyer.soutien_public && (
                          <span className="fn-badge fn-badge-sp">
                            <Shield className="h-3 w-3 mr-1" />
                            SP
                          </span>
                        )}
                        {lawyer.classement && (
                          <span className={getClassementBadge(lawyer.classement)}>
                            {lawyer.classement === 'Blacklist' ? (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Award className="h-3 w-3 mr-1" />
                            )}
                            {lawyer.classement}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2">
                        {lawyer.cabinet === 'Individuel' ? 'Avocat en individuel' : lawyer.cabinet}
                      </p>
                      
                      {lawyer.statut_cabinet && (
                        <p className="text-sm text-blue-600 mb-2">
                          {lawyer.statut_cabinet}
                        </p>
                      )}
                      
                      {lawyer.email && (
                        <p className="text-sm text-gray-500 mb-2">
                          {lawyer.email}
                        </p>
                      )}
                      
                      {lawyer.specialisations && lawyer.specialisations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {lawyer.specialisations.slice(0, 4).map((spec, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {spec}
                            </span>
                          ))}
                          {lawyer.specialisations.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{lawyer.specialisations.length - 4} autres
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination des avocats */}
          {totalPagesLawyers > 1 && (
            <div className="mt-8 flex justify-center items-center gap-3">
              <button
                onClick={() => setCurrentPageLawyers(1)}
                disabled={currentPageLawyers === 1}
                className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏮ Première
              </button>
              
              <button
                onClick={() => setCurrentPageLawyers(prev => Math.max(prev - 1, 1))}
                disabled={currentPageLawyers === 1}
                className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </button>
              
              <div className="bg-white px-4 py-2 rounded-md border-2 border-gray-200 text-sm font-medium">
                <span className="text-blue-600 font-semibold">Page {currentPageLawyers}</span>
                <span className="text-gray-500"> sur {totalPagesLawyers}</span>
                <div className="text-xs text-gray-400 mt-1">
                  ({startIndexLawyers + 1}-{Math.min(endIndexLawyers, results.lawyers.length)} sur {results.lawyers.length} avocats)
                </div>
              </div>
              
              <button
                onClick={() => setCurrentPageLawyers(prev => Math.min(prev + 1, totalPagesLawyers))}
                disabled={currentPageLawyers === totalPagesLawyers}
                className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
              
              <button
                onClick={() => setCurrentPageLawyers(totalPagesLawyers)}
                disabled={currentPageLawyers === totalPagesLawyers}
                className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dernière ⏭
              </button>
            </div>
          )}
        </section>
      )}

      {/* Aucun résultat */}
      {results.totalFound === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-fn-black mb-2">
            Aucun résultat trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            {results.query ? `Aucun résultat pour "${results.query}"` : 'Aucun résultat pour ce filtre'}
          </p>
          <button
            onClick={onClear}
            className="btn-fn-primary"
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  );
}