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

interface Lawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  classement: string;
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

  useEffect(() => {
    loadCabinetData();
    loadTeamMembers();
  }, []);

  const loadCabinetData = async () => {
    try {
      const response = await fetch(`/api/cabinet/${encodeURIComponent(cabinetName)}`);
      const data = await response.json();
      
      if (data.success) {
        setLawyers(data.cabinet.lawyers);
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
        loadCabinetData(); // Recharger les données
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
        loadCabinetData(); // Recharger les données
      }
    } catch (error) {
      console.error('Erreur désassignation:', error);
    }
  };

  const getClassementBadge = (classement: string) => {
    const variants = {
      'C1': 'bg-green-600 text-white',
      'C2': 'bg-green-400 text-white',
      'C3': 'bg-yellow-500 text-white',
      'Blacklist': 'bg-red-600 text-white',
    };

    if (!classement || !variants[classement as keyof typeof variants]) {
      return <Badge variant="secondary">Non classé</Badge>;
    }

    return (
      <Badge className={variants[classement as keyof typeof variants]}>
        {classement}
      </Badge>
    );
  };

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
    <div className="container mx-auto p-8">
      {/* En-tête */}
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
          {lawyers.length} avocat{lawyers.length > 1 ? 's' : ''}
        </p>
        
        {/* Stats cabinet */}
        {firmStats && (
          <div className="flex gap-4 mt-4">
            {getClassementBadge('C1') && <span>C1: {firmStats.c1_count}</span>}
            {getClassementBadge('C2') && <span>C2: {firmStats.c2_count}</span>}
            {getClassementBadge('C3') && <span>C3: {firmStats.c3_count}</span>}
            {firmStats.bl_count > 0 && <span className="text-red-600">Blacklist: {firmStats.bl_count}</span>}
          </div>
        )}
      </div>

      {/* Liste des avocats */}
      <div className="grid gap-4">
        {lawyers.map((lawyer) => (
          <Card key={lawyer.prenomnom} className="p-4">
            <div className="flex justify-between items-start">
              {/* Info avocat */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{lawyer.nom_complet}</h3>
                    <p className="text-sm text-gray-500">
                      Serment: {lawyer.annee_serment}
                    </p>
                  </div>
                </div>

                {/* Contact & badges */}
                <div className="flex gap-4 items-center mb-3">
                  {lawyer.telephone && (
                    <a href={`tel:${lawyer.telephone}`} className="text-blue-600 hover:underline">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {lawyer.telephone}
                    </a>
                  )}
                  {lawyer.email && (
                    <a href={`mailto:${lawyer.email}`} className="text-blue-600 hover:underline">
                      <Mail className="w-4 h-4 inline mr-1" />
                      {lawyer.email}
                    </a>
                  )}
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  {getClassementBadge(lawyer.classement)}
                  
                  {/* Warnings soutiens précédents */}
                  {lawyer.soutiens_precedents && lawyer.soutiens_precedents.length > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Soutien {lawyer.soutiens_precedents[0]}
                    </Badge>
                  )}
                  
                  {/* LinkedIn */}
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

              {/* Assignation */}
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
          </Card>
        ))}
      </div>

      {lawyers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun avocat trouvé pour ce cabinet</p>
        </div>
      )}
    </div>
  );
}