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
  const [firmStats, setFirmStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLawyers, setTotalLawyers] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  const [lawyersPerPage] = useState(50);
  const [statutFilter, setStatutFilter] = useState<string>('tous');
  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([]); // Tous les avocats pour stats

  // Plus besoin d'URLs de test - les photos viennent maintenant du Google Sheet via l'API

  useEffect(() => {
    loadCabinetData();
    loadTeamMembers();
    // Remonter en haut de la page lors du changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, statutFilter]);

  const loadCabinetData = async () => {
    try {
      // Charger toutes les pages pour avoir toutes les données pour filtrage
      const url = `/api/cabinet/${encodeURIComponent(cabinetName)}?page=1&limit=1000`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const allLawyersData = data.cabinet.lawyers;
        setAllLawyers(allLawyersData);
        
        // Appliquer le filtre par statut cabinet côté client
        let filteredLawyers = allLawyersData;
        
        if (statutFilter !== 'tous') {
          filteredLawyers = allLawyersData.filter((lawyer: Lawyer) => 
            lawyer.statut_cabinet === statutFilter
          );
        }
        
        // Pagination côté client pour les résultats filtrés
        const startIndex = (currentPage - 1) * lawyersPerPage;
        const endIndex = startIndex + lawyersPerPage;
        const paginatedLawyers = filteredLawyers.slice(startIndex, endIndex);
        
        setLawyers(paginatedLawyers);
        setFirmStats(data.cabinet.stats);
        setTotalLawyers(filteredLawyers.length);
        
        // Ajuster la pagination pour les résultats filtrés
        const filteredPagination = {
          currentPage: currentPage,
          totalPages: Math.ceil(filteredLawyers.length / lawyersPerPage),
          limit: lawyersPerPage,
          offset: startIndex,
          hasNext: currentPage < Math.ceil(filteredLawyers.length / lawyersPerPage),
          hasPrev: currentPage > 1
        };
        setPagination(filteredPagination);
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
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyer_prenomnom: lawyerPrenomnom,
          team_member_id: teamMemberId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadCabinetData();
      } else {
        alert('Erreur assignation: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur assignation:', error);
      alert('Erreur assignation');
    }
  };

  // Wrapper pour la nouvelle signature de LawyerCard
  const handleAssignWrapper: AssignWrapperFunction = (lawyer: Lawyer, teamMemberId: string) => {
    handleAssign(lawyer.prenomnom, teamMemberId);
  };

  const handleUnassign = async (lawyerPrenomnom: string) => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyer_prenomnom: lawyerPrenomnom }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadCabinetData();
      }
    } catch (error) {
      console.error('Erreur désassignation:', error);
    }
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
        {pagination && totalLawyers > lawyersPerPage && (
          <p className="text-lg text-gray-500 stats-numbers">
            Affichage de {((currentPage - 1) * lawyersPerPage) + 1} à {Math.min(currentPage * lawyersPerPage, totalLawyers)} sur {totalLawyers}
          </p>
        )}
        
        {firmStats && (
          <div className="flex gap-4 mt-4 flex-wrap">
            {firmStats.soutien_public_count > 0 && (
              <span className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold">
                Soutiens publics: {firmStats.soutien_public_count}
              </span>
            )}
            {firmStats.c1_count > 0 && (
              <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">
                C1: {firmStats.c1_count}
              </span>
            )}
            {firmStats.c2_count > 0 && (
              <span className="px-3 py-1 bg-yellow-500 text-white rounded text-sm font-semibold">
                C2: {firmStats.c2_count}
              </span>
            )}
            {firmStats.c3_count > 0 && (
              <span className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-semibold">
                C3: {firmStats.c3_count}
              </span>
            )}
            {firmStats.bl_count > 0 && (
              <span className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold">
                Blacklist: {firmStats.bl_count}
              </span>
            )}
            {firmStats.unclassified_count > 0 && (
              <span className="px-3 py-1 bg-gray-500 text-white rounded text-sm">
                Non classés: {firmStats.unclassified_count}
              </span>
            )}
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
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring"
            >
              Tous ({allLawyers.length})
            </Button>
            <Button
              variant={statutFilter === 'Associé' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatutFilter('Associé');
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
                setCurrentPage(1);
              }}
              className="icon-hover focus-ring fn-badge"
            >
              👨‍💼 Collaborateurs ({allLawyers.filter(l => l.statut_cabinet === 'Collaborateur').length})
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