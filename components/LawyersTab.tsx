'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetLawyer } from '@/lib/google-sheets';
import { TeamMember, Lawyer } from '@/types';
import LawyerCard from '@/components/LawyerCard';
import BallotBoxIcon from '@/components/ui/BallotBoxIcon';
import { Loader2 } from 'lucide-react';

interface LawyersStats {
  total: number;
  by_classification: {
    soutien_public: number;
    c1: number;
    c2: number;
    c3: number;
    blacklist: number;
    unclassified: number;
  };
  by_voting: {
    first_round: number;
    second_round: number;
    both_rounds: number;
    no_vote: number;
  };
  top_years_by_oath: Array<{ year: number; count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LawyersTabProps {}

export default function LawyersTab({}: LawyersTabProps) {
  const [lawyers, setLawyers] = useState<SheetLawyer[]>([]);
  const [stats, setStats] = useState<LawyersStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([]);
  const [selectedVoteFilters, setSelectedVoteFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [cabinetFilter, setCabinetFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
    loadTeamMembers();
  }, []);

  // Effet pour recharger les données quand on revient sur la page
  useEffect(() => {
    if (!mounted) return;

    // Fonction pour détecter les changements localStorage
    const handleStorageChange = () => {
      console.log('🔄 Changement localStorage détecté, rechargement des avocats...');
      loadLawyers();
    };

    // Écouter les changements localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Écouter l'événement personnalisé de changement de statut
    const handleLawyerStatusChanged = (event: any) => {
      console.log('📡 Événement lawyerStatusChanged reçu:', event.detail);
      loadLawyers();
    };

    window.addEventListener('lawyerStatusChanged', handleLawyerStatusChanged);
    
    // Écouter la visibilité de la page (quand l'utilisateur revient)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page redevient visible, vérification des données...');
        loadLawyers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Charger les données initiales
    loadLawyers();

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lawyerStatusChanged', handleLawyerStatusChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted]);

  const loadLawyers = async () => {
    try {
      setLoading(true);
      
      // Construction des paramètres de requête
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        classification: selectedClassifications.length > 0 ? selectedClassifications.join(',') : 'all',
        cabinet: cabinetFilter,
        vote: selectedVoteFilters.length > 0 ? selectedVoteFilters.join(',') : 'all',
        search: searchTerm,
        status: selectedStatusFilters.length > 0 ? selectedStatusFilters.join(',') : 'all',
      });

      console.log('🔍 Chargement des avocats avec filtres:', Object.fromEntries(params));
      
      // 🔄 NOUVEAU: Utiliser l'API qui fusionne localStorage
      // D'abord récupérer les statuts localStorage
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      const localStorageStatuses = statusChangesStorage.getCurrentStatuses();
      
      // Appeler la nouvelle API de fusion
      const response = await fetch('/api/lawyers-with-localstorage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localStorageStatuses,
          params: Object.fromEntries(params) // Passer les filtres
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Appliquer les filtres côté client (temporairement)
        let filteredLawyers = data.lawyers || [];
        
        // Filtrer par recherche - amélioration pour gérer les espaces et noms composés
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase().trim();
          const searchTerms = searchLower.split(' ').filter(term => term.length > 0);
          
          filteredLawyers = filteredLawyers.filter((lawyer: any) => {
            const searchableText = [
              lawyer.prenomnom?.toLowerCase() || '',
              lawyer.nom?.toLowerCase() || '',
              lawyer.prenom?.toLowerCase() || '',
              lawyer.nom_complet?.toLowerCase() || '',
              lawyer.email?.toLowerCase() || '',
              lawyer.cabinet?.toLowerCase() || ''
            ].join(' ');
            
            // Si recherche avec espaces, tous les termes doivent matcher
            if (searchTerms.length > 1) {
              return searchTerms.every(term => searchableText.includes(term));
            }
            
            // Recherche simple ou sans espace
            return searchableText.includes(searchLower);
          });
        }
        
        // Filtrer par classification - amélioration de la logique
        if (selectedClassifications.length > 0 && !selectedClassifications.includes('all')) {
          filteredLawyers = filteredLawyers.filter((lawyer: any) => {
            const classification = lawyer.classement?.trim() || '';
            
            // Gestion des classifications spéciales
            if (selectedClassifications.includes('soutien_public') && lawyer.soutien_public) {
              return true;
            }
            
            if (selectedClassifications.includes('unclassified')) {
              return !classification || !['C1', 'C2', 'C3', 'Blacklist'].includes(classification);
            }
            
            // Classifications standard
            return selectedClassifications.some(selected => {
              if (selected === 'c1') return classification === 'C1';
              if (selected === 'c2') return classification === 'C2';
              if (selected === 'c3') return classification === 'C3';
              if (selected === 'blacklist') return classification === 'Blacklist';
              return selected === classification;
            });
          });
        }
        
        setLawyers(filteredLawyers);
        setStats(data.stats || null);
        setPagination({
          page: currentPage,
          limit: 50,
          total: filteredLawyers.length,
          totalPages: Math.ceil(filteredLawyers.length / 50)
        });
        console.log(`✅ ${filteredLawyers.length} avocats chargés avec localStorage`);
      } else {
        console.error('❌ Erreur API avocats avec localStorage:', data.error);
      }
    } catch (error) {
      console.error('❌ Erreur chargement avocats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rechargement lors du changement de filtres (avec délai pour la recherche)
  useEffect(() => {
    if (!mounted) return;
    
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1);
      loadLawyers();
    }, searchTerm ? 500 : 0); // Délai de 500ms pour la recherche textuelle
    
    return () => clearTimeout(delayedSearch);
  }, [mounted, selectedClassifications, selectedVoteFilters, selectedStatusFilters, cabinetFilter, searchTerm]);

  // Rechargement lors du changement de page
  useEffect(() => {
    if (mounted && currentPage > 1) {
      loadLawyers();
    }
  }, [currentPage]);

  // Charger les membres de l'équipe
  const loadTeamMembers = async () => {
    try {
      console.log('🔄 LawyersTab: Chargement des membres d\'équipe...');
      const response = await fetch('/api/team');
      const data = await response.json();
      console.log('👥 LawyersTab: Réponse team API:', data);
      if (data.success) {
        setTeamMembers(data.team_members || []);
        console.log('✅ LawyersTab: Membres d\'équipe chargés:', data.team_members?.length, 'membres');
      } else {
        console.error('❌ LawyersTab: Erreur chargement équipe:', data.error);
      }
    } catch (error) {
      console.error('❌ LawyersTab: Erreur chargement équipe:', error);
    }
  };

  // Fonction d'assignation (même logique que Cabinet)
  const handleAssign = async (lawyerPrenomnom: string, teamMemberId: string) => {
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
        // Recharger les données des avocats
        loadLawyers();
        console.log('✅ Avocat assigné avec succès');
      } else {
        alert('Erreur assignation: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur assignation:', error);
      alert('Erreur assignation');
    }
  };

  // Fonction de désassignation (même logique que Cabinet)
  const handleUnassign = async (lawyerPrenomnom: string) => {
    try {
      console.log('🔄 LawyersTab: Début désassignation:', lawyerPrenomnom);
      const response = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyer_prenomnom: lawyerPrenomnom }),
      });
      
      const data = await response.json();
      console.log('📝 LawyersTab: Réponse désassignation:', data);
      
      if (data.success) {
        console.log('✅ LawyersTab: Désassignation réussie, rechargement des données...');
        await loadLawyers();
        console.log('✅ LawyersTab: Données rechargées');
      } else {
        alert('Erreur désassignation: ' + data.error);
      }
    } catch (error) {
      console.error('❌ LawyersTab: Erreur désassignation:', error);
      alert('Erreur désassignation');
    }
  };

  // Wrapper pour la signature attendue par LawyerCard
  const handleAssignWrapper = async (lawyer: Lawyer, teamMemberId: string) => {
    console.log('📋 LawyersTab: Assignation demandée:', {
      lawyerName: lawyer.prenomnom,
      teamMemberId,
      teamMembersCount: teamMembers.length
    });
    await handleAssign(lawyer.prenomnom, teamMemberId);
  };

  // Wrapper pour la désassignation attendue par LawyerCard
  const handleUnassignWrapper = async (lawyer: Lawyer) => {
    console.log('📋 LawyersTab: Désassignation demandée:', lawyer.prenomnom);
    await handleUnassign(lawyer.prenomnom);
  };

  // Gestion des étiquettes cliquables
  const toggleClassificationFilter = (classification: string) => {
    setSelectedClassifications(prev => 
      prev.includes(classification) 
        ? prev.filter(c => c !== classification)
        : [...prev, classification]
    );
  };

  const toggleVoteFilter = (voteType: string) => {
    setSelectedVoteFilters(prev => 
      prev.includes(voteType)
        ? prev.filter(v => v !== voteType)
        : [...prev, voteType]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatusFilters(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedClassifications([]);
    setSelectedVoteFilters([]);
    setSelectedStatusFilters([]);
    setCabinetFilter('');
  };


  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Initialisation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Avocats total</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="text-2xl font-bold text-green-600">{stats.by_classification.soutien_public}</div>
            <div className="text-sm text-gray-600">Soutien Public</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{stats.by_voting.both_rounds}</div>
            <div className="text-sm text-gray-600">Ont voté 2 tours</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{stats.by_voting.first_round}</div>
            <div className="text-sm text-gray-600">Ont voté 1er tour</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{stats.by_voting.no_vote}</div>
            <div className="text-sm text-gray-600">N'ont pas voté</div>
          </div>
        </div>
      )}

      {/* Bouton de chargement - seulement si aucune donnée initiale */}
      {lawyers.length === 0 && !loading && !pagination && (
        <div className="text-center">
          <button
            onClick={loadLawyers}
            disabled={loading}
            className="btn-fn-primary icon-hover focus-ring flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </>
            ) : (
              '👥 Charger la liste des avocats'
            )}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Cliquez pour charger et parcourir tous les avocats
          </p>
        </div>
      )}

      {/* Filtres - toujours affichés après premier chargement */}
      {(lawyers.length > 0 || pagination) && (
        <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">🔍 Filtres</h3>
            <Button
              onClick={resetAllFilters}
              variant="outline"
              className="text-sm"
            >
              🔄 Réinitialiser
            </Button>
          </div>
          
          {/* Recherche textuelle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recherche
            </label>
            <div className="max-w-lg">
              <Input
                type="text"
                placeholder="Nom, prénom, cabinet, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="fn-input"
              />
            </div>
          </div>

          {/* Cabinet Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par cabinet
            </label>
            <div className="max-w-lg">
              <Input
                type="text"
                placeholder="Nom du cabinet..."
                value={cabinetFilter}
                onChange={(e) => setCabinetFilter(e.target.value)}
                className="fn-input"
              />
            </div>
          </div>

          {/* Classifications */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Classements
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleClassificationFilter('soutien_public')}
                className={`fn-badge fn-badge-sp transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('soutien_public') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
              >
                Soutien Public
              </button>
              <button
                onClick={() => toggleClassificationFilter('c1')}
                className={`fn-badge fn-badge-c1 transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('c1') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
              >
                C1
              </button>
              <button
                onClick={() => toggleClassificationFilter('c2')}
                className={`fn-badge fn-badge-c2 transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('c2') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
              >
                C2
              </button>
              <button
                onClick={() => toggleClassificationFilter('c3')}
                className={`fn-badge fn-badge-c3 transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('c3') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
              >
                C3
              </button>
              <button
                onClick={() => toggleClassificationFilter('blacklist')}
                className={`fn-badge fn-badge-bl transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('blacklist') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
              >
                Blacklist
              </button>
              <button
                onClick={() => toggleClassificationFilter('unclassified')}
                className={`fn-badge transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedClassifications.includes('unclassified') ? 'scale-110 font-bold' : 'hover:scale-105'
                }`}
                style={{backgroundColor: 'var(--fn-gray-medium)', color: 'var(--fn-white)'}}
              >
                Non classés
              </button>
            </div>
          </div>

          {/* Participations au vote */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Participation au vote
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleVoteFilter('first_round')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedVoteFilters.includes('first_round') 
                    ? 'scale-110 font-bold border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-white hover:scale-105 hover:border-green-300'
                }`}
              >
                <BallotBoxIcon voted={true} className="w-6 h-6" />
                <span className="text-sm">1er tour</span>
              </button>
              <button
                onClick={() => toggleVoteFilter('second_round')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedVoteFilters.includes('second_round') 
                    ? 'scale-110 font-bold border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-white hover:scale-105 hover:border-green-300'
                }`}
              >
                <BallotBoxIcon voted={true} className="w-6 h-6" />
                <span className="text-sm">2ème tour</span>
              </button>
              <button
                onClick={() => toggleVoteFilter('both')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedVoteFilters.includes('both') 
                    ? 'scale-110 font-bold border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-white hover:scale-105 hover:border-green-300'
                }`}
              >
                <div className="flex gap-1">
                  <BallotBoxIcon voted={true} className="w-5 h-5" />
                  <BallotBoxIcon voted={true} className="w-5 h-5" />
                </div>
                <span className="text-sm">Les 2 tours</span>
              </button>
              <button
                onClick={() => toggleVoteFilter('none')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedVoteFilters.includes('none') 
                    ? 'scale-110 font-bold border-red-500 bg-red-50' 
                    : 'border-gray-300 bg-white hover:scale-105 hover:border-red-300'
                }`}
              >
                <BallotBoxIcon voted={false} className="w-6 h-6" />
                <span className="text-sm">N'a pas voté</span>
              </button>
            </div>
          </div>

          {/* Filtres par statut cabinet */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Statut dans le cabinet
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleStatusFilter('Associé')}
                className={`fn-badge transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedStatusFilters.includes('Associé') ? 'scale-110 font-bold border-2 border-blue-600' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedStatusFilters.includes('Associé') ? '#2563eb' : '#e2e8f0', 
                  color: selectedStatusFilters.includes('Associé') ? 'white' : '#334155'
                }}
              >
                👔 Associé
              </button>
              <button
                onClick={() => toggleStatusFilter('Collaborateur')}
                className={`fn-badge transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedStatusFilters.includes('Collaborateur') ? 'scale-110 font-bold border-2 border-green-600' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedStatusFilters.includes('Collaborateur') ? '#16a34a' : '#e2e8f0', 
                  color: selectedStatusFilters.includes('Collaborateur') ? 'white' : '#334155'
                }}
              >
                👨‍💼 Collaborateur
              </button>
              <button
                onClick={() => toggleStatusFilter('Individuel')}
                className={`fn-badge transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedStatusFilters.includes('Individuel') ? 'scale-110 font-bold border-2 border-orange-600' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedStatusFilters.includes('Individuel') ? '#ea580c' : '#e2e8f0', 
                  color: selectedStatusFilters.includes('Individuel') ? 'white' : '#334155'
                }}
              >
                ⭐ Individuel
              </button>
              <button
                onClick={() => toggleStatusFilter('Non trouvé')}
                className={`fn-badge transition-transform duration-200 cursor-pointer hover:shadow-lg ${
                  selectedStatusFilters.includes('Non trouvé') ? 'scale-110 font-bold border-2 border-gray-600' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedStatusFilters.includes('Non trouvé') ? '#6b7280' : '#e2e8f0', 
                  color: selectedStatusFilters.includes('Non trouvé') ? 'white' : '#334155'
                }}
              >
                ❓ Non trouvé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des avocats */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-lg">Chargement des avocats...</div>
        </div>
      )}

      {!loading && lawyers.length > 0 && (
        <>
          {/* Informations de pagination */}
          {pagination && (
            <div className="text-sm text-gray-600">
              {pagination.total.toLocaleString()} avocat{pagination.total > 1 ? 's' : ''} trouvé{pagination.total > 1 ? 's' : ''}
              {pagination.total !== stats?.total && (
                <span> (filtré{pagination.total > 1 ? 's' : ''} sur {stats?.total.toLocaleString()})</span>
              )}
            </div>
          )}

          {/* Liste d'avocats avec LawyerCard */}
          <div className="grid gap-4">
            {lawyers.map((lawyer, index) => {
              if (index === 0) {
                console.log('🃏 LawyersTab: Premier LawyerCard - teamMembers:', teamMembers);
              }
              return (
                <LawyerCard 
                  key={`${lawyer.prenomnom}-${index}`}
                  lawyer={lawyer as Lawyer}
                  onAssign={handleAssignWrapper}
                  onUnassign={handleUnassignWrapper}
                  teamMembers={teamMembers}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-3">
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
                <span className="text-gray-500"> sur {pagination.totalPages}</span>
                <div className="text-xs text-gray-400 mt-1">
                  ({((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, pagination.total)} sur {pagination.total} avocats)
                </div>
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
              >
                Suivant →
              </button>
              
              <button
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={currentPage === pagination.totalPages}
                className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed icon-hover focus-ring"
              >
                Dernière ⏭
              </button>
            </div>
          )}
        </>
      )}

      {/* Message si aucun résultat - amélioré */}
      {!loading && lawyers.length === 0 && pagination && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-fn-black mb-2">Aucun avocat trouvé</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 
              `Aucun avocat ne correspond à "${searchTerm}"` : 
              'Aucun avocat ne correspond aux filtres sélectionnés'
            }
          </p>
          <Button
            onClick={resetAllFilters}
            variant="outline"
            className="text-sm"
          >
            🔄 Réinitialiser tous les filtres
          </Button>
        </div>
      )}
    </div>
  );
}