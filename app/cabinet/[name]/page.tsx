'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Mail, Phone, AlertTriangle, User } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface Lawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  classement: string;
  origine: string;
  soutien_public: boolean;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  assignments: {
    id: string;
    team_member_id: string;
    assigned_at: string;
    team_members: {
      id: string;
      prenom: string;
      nom: string;
      email: string;
    };
  }[];
  photo_url?: string;
}

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

export default function CabinetPage() {
  const params = useParams();
  const router = useRouter();
  const cabinetName = decodeURIComponent(params.name as string);
  
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [firmStats, setFirmStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLawyers, setTotalLawyers] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  const [lawyersPerPage] = useState(50);

  // Plus besoin d'URLs de test - les photos viennent maintenant du Google Sheet via l'API

  useEffect(() => {
    loadCabinetData();
    loadTeamMembers();
    // Remonter en haut de la page lors du changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const loadCabinetData = async () => {
    try {
      const url = `/api/cabinet/${encodeURIComponent(cabinetName)}?page=${currentPage}&limit=${lawyersPerPage}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setLawyers(data.cabinet.lawyers);
        setFirmStats(data.cabinet.stats);
        setTotalLawyers(data.cabinet.totalLawyers);
        setPagination(data.cabinet.pagination);
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
        loadCabinetData();
      } else {
        alert('Erreur assignation: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur assignation:', error);
      alert('Erreur assignation');
    }
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
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        
        <h1 className="text-4xl font-bold mb-2">{cabinetName}</h1>
        <p className="text-xl text-gray-600">
          {totalLawyers} avocat{totalLawyers > 1 ? 's' : ''} au total
        </p>
        {pagination && totalLawyers > lawyersPerPage && (
          <p className="text-lg text-gray-500">
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
      </div>

      <div className="grid gap-4">
        {lawyers.map((lawyer) => (
          <Card key={lawyer.prenomnom} className="p-4">
            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-300">
                {lawyer.photo_url ? (
                  <img 
                    src={lawyer.photo_url}
                    alt={`Photo de ${lawyer.nom_complet}`}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <User className={`w-8 h-8 text-gray-500 ${lawyer.photo_url ? 'hidden' : ''}`} />
              </div>

              <div className="flex-1 min-w-0 flex justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <h3 className="font-semibold text-lg">{lawyer.nom_complet}</h3>
                    <p className="text-sm text-gray-500">
                      Serment: {lawyer.annee_serment}
                    </p>
                  </div>

                  <div className="flex gap-4 items-center mb-3 flex-wrap">
                    {lawyer.telephone && (
                      <a href={`tel:${lawyer.telephone}`} className="text-blue-600 hover:underline text-sm">
                        <Phone className="w-4 h-4 inline mr-1" />
                        {lawyer.telephone}
                      </a>
                    )}
                    {lawyer.email && (
                      <a href={`mailto:${lawyer.email}`} className="text-blue-600 hover:underline text-sm">
                        <Mail className="w-4 h-4 inline mr-1" />
                        {lawyer.email}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 items-center flex-wrap">
                    {lawyer.soutien_public && getSoutienPublicBadge()}
                    {getClassementBadge(lawyer.classement, lawyer.origine)}
                    
                    {lawyer.soutiens_precedents && lawyer.soutiens_precedents.length > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Soutien {lawyer.soutiens_precedents[0]}
                      </Badge>
                    )}
                    
                    {lawyer.ami_linkedin_mhf && (
                      <Badge variant="outline" title="Ami LinkedIn Marie-Hélène Fabiani">
                        🔗 MHF
                      </Badge>
                    )}
                    {lawyer.ami_linkedin_fn && (
                      <Badge variant="outline" title="Ami LinkedIn Frédéric Naquet">
                        🔗 FN
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {lawyer.assignments && lawyer.assignments.length > 0 ? (
                    <div className="text-right">
                      <p className="text-sm text-green-600 mb-2">
                        Assigné à <strong>{lawyer.assignments[0].team_members.prenom} {lawyer.assignments[0].team_members.nom}</strong>
                      </p>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">Réassigner</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {teamMembers.map((member) => (
                              <DropdownMenuItem
                                key={member.id}
                                onClick={() => handleAssign(lawyer.prenomnom, member.id)}
                              >
                                {member.prenom} {member.nom}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUnassign(lawyer.prenomnom)}
                        >
                          Désassigner
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {lawyer.classement === 'Blacklist' ? (
                        <Badge variant="destructive">Pas d'assignation (Blacklist)</Badge>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm">Assigner à...</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {teamMembers.map((member) => (
                              <DropdownMenuItem
                                key={member.id}
                                onClick={() => handleAssign(lawyer.prenomnom, member.id)}
                              >
                                {member.prenom} {member.nom}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Contrôles de pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t">
          {/* Informations de pagination */}
          <div className="text-sm text-gray-600 font-medium">
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
                    className="min-w-[40px]"
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
                className="w-16 px-2 py-1 text-center border rounded"
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