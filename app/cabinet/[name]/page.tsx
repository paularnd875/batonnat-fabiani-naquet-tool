'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';
import { Lawyer, TeamMember, AssignFunction, AssignWrapperFunction } from '@/types';

// Dynamic imports pour le code splitting
const LawyerCard = dynamic(() => import('@/components/LawyerCard'), {
  loading: () => (
    <div className="p-4 border rounded-lg animate-pulse">
      <div className="flex gap-4">
        <div className="w-24 h-24 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  ),
  ssr: false
});


export default function CabinetPage() {
  const params = useParams();
  const router = useRouter();
  const cabinetName = params?.name ? decodeURIComponent(params.name as string) : '';
  
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [firmStats, setFirmStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLawyers, setTotalLawyers] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  const [lawyersPerPage] = useState(50);
  const [statutFilter, setStatutFilter] = useState<string>('tous');
  const [classificationFilter, setClassificationFilter] = useState<string>('tous');
  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([]); // Tous les avocats pour stats

  // Plus besoin d'URLs de test - les photos viennent maintenant du Google Sheet via l'API

  useEffect(() => {
    loadCabinetData();
    loadTeamMembers();
    // Remonter en haut de la page lors du changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, statutFilter, classificationFilter]);

  const loadCabinetData = async () => {
    try {
      // Si on utilise un filtre, charger TOUTES les données pour pouvoir filtrer côté client
      let url;
      if (statutFilter !== 'tous' || classificationFilter !== 'tous') {
        url = `/api/cabinet/${encodeURIComponent(cabinetName)}?page=1&limit=10000`; // Limite très élevée pour avoir toutes les données
      } else {
        url = `/api/cabinet/${encodeURIComponent(cabinetName)}?page=${currentPage}&limit=${lawyersPerPage}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const allLawyersData = data.cabinet.lawyers;
        
        // Sauvegarder tous les avocats pour les stats (seulement si on n'a pas encore les données)
        if (allLawyers.length === 0 && allLawyersData.length > 0) {
          // Pour avoir VRAIMENT toutes les données, faire une requête spéciale
          const allDataResponse = await fetch(`/api/cabinet/${encodeURIComponent(cabinetName)}?page=1&limit=10000`);
          const allDataResult = await allDataResponse.json();
          if (allDataResult.success) {
            setAllLawyers(allDataResult.cabinet.lawyers);
          }
        }
        
        // Appliquer les filtres côté client
        let filteredLawyers = allLawyersData;
        
        // Filtrage par statut cabinet
        if (statutFilter !== 'tous') {
          filteredLawyers = filteredLawyers.filter((lawyer: Lawyer) => {
            const statut = lawyer.statut_cabinet?.trim();
            
            // Le filtrage doit correspondre exactement aux valeurs dans les données
            if (statutFilter === 'Individuel') {
              return statut === 'Individuel';
            }
            if (statutFilter === 'Associé') {
              return statut === 'Associé';
            }
            if (statutFilter === 'Collaborateur') {
              return statut === 'Collaborateur';
            }
            
            return false;
          });
        }

        // Filtrage par classification
        if (classificationFilter !== 'tous') {
          filteredLawyers = filteredLawyers.filter((lawyer: Lawyer) => {
            const classification = lawyer.classement?.trim();
            
            if (classificationFilter === 'soutien_public') {
              return lawyer.soutien_public === true;
            }
            if (classificationFilter === 'c1') {
              return classification === 'C1';
            }
            if (classificationFilter === 'c2') {
              return classification === 'C2';
            }
            if (classificationFilter === 'c3') {
              return classification === 'C3';
            }
            if (classificationFilter === 'blacklist') {
              return classification === 'Blacklist';
            }
            if (classificationFilter === 'unclassified') {
              return !classification || !['C1', 'C2', 'C3', 'Blacklist'].includes(classification);
            }
            
            return false;
          });
        }
        
        // Si on utilise un filtre, appliquer la pagination côté client
        if (statutFilter !== 'tous' || classificationFilter !== 'tous') {
          const startIndex = (currentPage - 1) * lawyersPerPage;
          const endIndex = startIndex + lawyersPerPage;
          const paginatedFiltered = filteredLawyers.slice(startIndex, endIndex);
          
          setLawyers(paginatedFiltered);
          setTotalLawyers(filteredLawyers.length);
          setPagination({
            currentPage,
            totalPages: Math.ceil(filteredLawyers.length / lawyersPerPage),
            limit: lawyersPerPage,
            offset: startIndex,
            hasNext: endIndex < filteredLawyers.length,
            hasPrev: currentPage > 1
          });
        } else {
          setLawyers(filteredLawyers);
          setTotalLawyers(data.cabinet.totalLawyers); // Utiliser le total de l'API
          setPagination(data.cabinet.pagination);
        }
        
        setFirmStats(data.cabinet.stats);
      }
    } catch (error) {
      console.error('Erreur chargement cabinet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();
      
      if (data.success) {
        setTeamMembers(data.team_members);
      }
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    }
  };

  const handleAssign: AssignFunction = async (lawyerPrenomnom: string, teamMemberId: string) => {
    try {
      console.log('📝 Cabinet: Début assignation:', { lawyerPrenomnom, teamMemberId });
      setAssignmentLoading(true);
      
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyer_prenomnom: lawyerPrenomnom,
          team_member_id: teamMemberId,
        }),
      });
      
      const data = await response.json();
      console.log('📝 Cabinet: Réponse assignation:', data);
      
      if (data.success) {
        console.log('✅ Cabinet: Assignation réussie, rechargement des données...');
        await loadCabinetData();
        console.log('✅ Cabinet: Données rechargées');
      } else {
        alert('Erreur assignation: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Cabinet: Erreur assignation:', error);
      alert('Erreur assignation');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Wrapper pour la nouvelle signature de LawyerCard
  const handleAssignWrapper: AssignWrapperFunction = (lawyer: Lawyer, teamMemberId: string) => {
    handleAssign(lawyer.prenomnom, teamMemberId);
  };

  const handleUnassign = async (lawyerPrenomnom: string) => {
    try {
      console.log('🔄 Cabinet: Début désassignation:', lawyerPrenomnom);
      setAssignmentLoading(true);
      
      const response = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyer_prenomnom: lawyerPrenomnom }),
      });
      
      const data = await response.json();
      console.log('📝 Cabinet: Réponse désassignation:', data);
      
      if (data.success) {
        console.log('✅ Cabinet: Désassignation réussie, rechargement des données...');
        await loadCabinetData();
        console.log('✅ Cabinet: Données rechargées');
      } else {
        alert('Erreur désassignation: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Cabinet: Erreur désassignation:', error);
      alert('Erreur désassignation');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Wrapper pour la nouvelle signature de LawyerCard (désassignation)
  const handleUnassignWrapper = (lawyer: Lawyer) => {
    handleUnassign(lawyer.prenomnom);
  };

  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setStatutFilter('tous');
    setClassificationFilter('tous');
    setCurrentPage(1);
  };

  const getClassementBadge = (classement: string, origine: string) => {
    const variants = {
      'C1': 'bg-blue-600 text-white',
      'C2': 'bg-yellow-500 text-white',
      'C3': 'bg-orange-500 text-white',
      'Blacklist': 'bg-red-600 text-white',
    };

    if (!classement || !variants[classement as keyof typeof variants]) {
      return <Badge variant="secondary">Non classé</Badge>;
    }

    const displayText = origine ? `${classement} (${origine})` : classement;

    return (
      <Badge className={variants[classement as keyof typeof variants]}>
        {displayText}
      </Badge>
    );
  };

  const getSoutienPublicBadge = () => {
    return (
      <Badge className="bg-green-600 text-white">
        Soutien Public
      </Badge>
    );
  };

  // Le tri est maintenant fait côté API

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement du cabinet...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4 icon-hover focus-ring"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        
        <h1 className="text-4xl font-bold mb-2 text-balance">{cabinetName}</h1>
        <p className="text-xl text-gray-600 stats-numbers">
          {totalLawyers} avocat{totalLawyers > 1 ? 's' : ''} au total
        </p>
        
        {/* Indicateur de chargement assignation */}
        {assignmentLoading && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span className="text-sm font-medium">Assignation en cours...</span>
            </div>
          </div>
        )}
        {pagination && totalLawyers > lawyersPerPage && (
          <p className="text-lg text-gray-500 stats-numbers">
            Affichage de {((currentPage - 1) * lawyersPerPage) + 1} à {Math.min(currentPage * lawyersPerPage, totalLawyers)} sur {totalLawyers}
          </p>
        )}
        
        {firmStats && (
          <div className="flex gap-4 mt-4 flex-wrap">
            {firmStats.soutien_public_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'soutien_public' ? 'tous' : 'soutien_public');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold cursor-pointer hover:bg-green-700 transition-colors focus-ring ${
                  classificationFilter === 'soutien_public' ? 'ring-2 ring-green-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                Soutiens publics: {firmStats.soutien_public_count}
              </button>
            )}
            {firmStats.c1_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'c1' ? 'tous' : 'c1');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors focus-ring ${
                  classificationFilter === 'c1' ? 'ring-2 ring-blue-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                C1: {firmStats.c1_count}
              </button>
            )}
            {firmStats.c2_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'c2' ? 'tous' : 'c2');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-yellow-500 text-white rounded text-sm font-semibold cursor-pointer hover:bg-yellow-600 transition-colors focus-ring ${
                  classificationFilter === 'c2' ? 'ring-2 ring-yellow-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                C2: {firmStats.c2_count}
              </button>
            )}
            {firmStats.c3_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'c3' ? 'tous' : 'c3');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-orange-500 text-white rounded text-sm font-semibold cursor-pointer hover:bg-orange-600 transition-colors focus-ring ${
                  classificationFilter === 'c3' ? 'ring-2 ring-orange-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                C3: {firmStats.c3_count}
              </button>
            )}
            {firmStats.bl_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'blacklist' ? 'tous' : 'blacklist');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold cursor-pointer hover:bg-red-700 transition-colors focus-ring ${
                  classificationFilter === 'blacklist' ? 'ring-2 ring-red-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                Blacklist: {firmStats.bl_count}
              </button>
            )}
            {firmStats.unclassified_count > 0 && (
              <button 
                onClick={() => {
                  setClassificationFilter(classificationFilter === 'unclassified' ? 'tous' : 'unclassified');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 bg-gray-500 text-white rounded text-sm cursor-pointer hover:bg-gray-600 transition-colors focus-ring ${
                  classificationFilter === 'unclassified' ? 'ring-2 ring-gray-300' : ''
                }`}
                title="Cliquer pour filtrer"
              >
                Non classés: {firmStats.unclassified_count}
              </button>
            )}
          </div>
        )}
        
        {/* Indicateur de filtres actifs */}
        {(statutFilter !== 'tous' || classificationFilter !== 'tous') && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-700">
                <span className="font-medium">Filtres actifs:</span>
                {statutFilter !== 'tous' && <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">Statut: {statutFilter}</span>}
                {classificationFilter !== 'tous' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                    Classification: {
                      classificationFilter === 'soutien_public' ? 'Soutien Public' :
                      classificationFilter === 'c1' ? 'C1' :
                      classificationFilter === 'c2' ? 'C2' :
                      classificationFilter === 'c3' ? 'C3' :
                      classificationFilter === 'blacklist' ? 'Blacklist' :
                      classificationFilter === 'unclassified' ? 'Non classés' : classificationFilter
                    }
                  </span>
                )}
              </div>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Réinitialiser tous les filtres
              </button>
            </div>
          </div>
        )}
        
        {/* Filtres par statut cabinet */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Filtrer par statut</h3>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant={statutFilter === 'tous' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatutFilter('tous');
                setClassificationFilter('tous');
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring"
            >
              Tous ({totalLawyers})
            </Button>
            <Button
              variant={statutFilter === 'Associé' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatutFilter('Associé');
                setClassificationFilter('tous');
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring fn-badge"
            >
              ⚖️ Associés ({allLawyers.filter(l => l.statut_cabinet === 'Associé').length})
            </Button>
            <Button
              variant={statutFilter === 'Collaborateur' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatutFilter('Collaborateur');
                setClassificationFilter('tous');
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring fn-badge"
            >
              👨‍💼 Collaborateurs ({allLawyers.filter(l => l.statut_cabinet === 'Collaborateur').length})
            </Button>
            <Button
              variant={statutFilter === 'Individuel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatutFilter('Individuel');
                setClassificationFilter('tous');
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring fn-badge"
            >
              🏛️ Individuels ({allLawyers.filter(l => l.statut_cabinet === 'Individuel').length})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {lawyers.map((lawyer) => (
          <Suspense key={lawyer.prenomnom} fallback={
            <div className="p-4 border rounded-lg animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </div>
          }>
            <LawyerCard 
              lawyer={lawyer}
              onAssign={handleAssignWrapper}
              onUnassign={handleUnassignWrapper}
              teamMembers={teamMembers}
            />
          </Suspense>
        ))}

      </div>

      {/* Contrôles de pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t">
          {/* Informations de pagination */}
          <div className="text-sm text-gray-600 font-medium stats-numbers">
            Page {currentPage} sur {pagination.totalPages} • {totalLawyers} avocats au total
          </div>
          
          {/* Contrôles de navigation */}
          <div className="flex items-center gap-2">
            {/* Première page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              title="Première page"
              className="icon-hover focus-ring"
            >
              ≪
            </Button>
            
            {/* Précédent */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev || loading}
              title="Page précédente"
              className="icon-hover focus-ring"
            >
              ‹
            </Button>
            
            {/* Numéros de pages */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className="min-w-[40px] icon-hover focus-ring"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            {/* Suivant */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext || loading}
              title="Page suivante"
              className="icon-hover focus-ring"
            >
              ›
            </Button>
            
            {/* Dernière page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages || loading}
              title="Dernière page"
              className="icon-hover focus-ring"
            >
              ≫
            </Button>
          </div>
          
          {/* Navigation rapide - seulement pour beaucoup de pages */}
          {pagination.totalPages > 10 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Aller à la page :</span>
              <input
                type="number"
                min="1"
                max={pagination.totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= pagination.totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-16 px-2 py-1 text-center border rounded focus-ring stats-numbers"
                disabled={loading}
              />
              <span className="text-gray-500">sur {pagination.totalPages}</span>
            </div>
          )}
        </div>
      )}

      {lawyers.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun avocat trouvé pour ce cabinet</p>
        </div>
      )}
      </div>
    </div>
  );
}