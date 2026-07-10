'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TeamMemberStats {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  total_assignments: number;
  assigned_lawyers: {
    lawyer_prenomnom: string;
    lawyer_nom_complet?: string;
    lawyer_cabinet?: string;
    lawyer_classement?: string;
    assigned_at: string;
  }[];
}

export default function RecapitulatifPage() {
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<string | null>(null);

  useEffect(() => {
    loadTeamStats();
  }, []);

  const loadTeamStats = async () => {
    try {
      const response = await fetch('/api/team-stats');
      const data = await response.json();
      
      if (data.success) {
        setTeamStats(data.team_stats || []);
      } else {
        console.error('Erreur API:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement stats équipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (lawyerPrenomnom: string, teamMemberId?: string) => {
    // Trouver les détails de l'avocat pour un message plus clair
    const assignment = teamStats
      .flatMap(member => member.assigned_lawyers)
      .find(lawyer => lawyer.lawyer_prenomnom === lawyerPrenomnom);

    const lawyerName = assignment?.lawyer_nom_complet || lawyerPrenomnom;
    const cabinet = assignment?.lawyer_cabinet ? ` (${assignment.lawyer_cabinet})` : '';

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'assignation de :\n\n${lawyerName}${cabinet}\n\nCette action est irréversible.`)) {
      return;
    }

    // Clé de chargement par couple (membre, avocat) : un même avocat peut
    // apparaître sous plusieurs membres (multi-soutiens).
    setDeletingAssignment(teamMemberId ? `${teamMemberId}:${lawyerPrenomnom}` : lawyerPrenomnom);

    try {
      const response = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lawyer_prenomnom: lawyerPrenomnom,
          ...(teamMemberId ? { team_member_id: teamMemberId } : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Recharger les stats pour mettre à jour l'affichage
        await loadTeamStats();
        // Message de succès plus discret
        const lawyerName = assignment?.lawyer_nom_complet || lawyerPrenomnom;
        console.log(` Assignation de ${lawyerName} supprimée avec succès`);
      } else {
        console.error('Erreur suppression:', data.error);
        alert('Erreur lors de la suppression: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur suppression assignation:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeletingAssignment(null);
    }
  };

  const getTotalAssignments = () => {
    return teamStats.reduce((total, member) => total + member.total_assignments, 0);
  };

  const getClassementBadge = (classement: string | undefined) => {
    if (!classement) return null;
    
    const variants = {
      'C1': 'bg-green-600 text-white',
      'C2': 'bg-green-400 text-white', 
      'C3': 'bg-yellow-500 text-white',
      'Blacklist': 'bg-red-600 text-white'
    };

    return (
      <Badge className={variants[classement as keyof typeof variants] || 'bg-gray-600 text-white'}>
        {classement}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement des statistiques...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Récapitulatif des assignations</h1>
        <p className="text-xl text-gray-600">
          {getTotalAssignments()} assignation{getTotalAssignments() > 1 ? 's' : ''} réparties sur {teamStats.length} membre{teamStats.length > 1 ? 's' : ''} d'équipe
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 border-b">
          <Button variant="ghost" asChild>
            <Link href="/">Cabinets</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/historique">Historique</Link>
          </Button>
          <Button variant="ghost" className="border-b-2 border-blue-500 text-blue-600 font-semibold">
            Récapitulatif
          </Button>
        </div>
        
        <div className="flex gap-4 items-center">
          <Button variant="outline" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vue d'ensemble</CardTitle>
            <CardDescription>Répartition des assignations par membre d'équipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamStats.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold">{member.prenom} {member.nom}</div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {member.total_assignments}
                    </div>
                    <div className="text-xs text-gray-500">assignation{member.total_assignments > 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails par membre */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Détails par membre</h2>
        
        {teamStats.map((member) => (
          <Card key={member.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">
                    {member.prenom} {member.nom}
                  </CardTitle>
                  <CardDescription>
                    {member.email} • {member.total_assignments} assignation{member.total_assignments > 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedMember(
                    expandedMember === member.id ? null : member.id
                  )}
                >
                  {expandedMember === member.id ? 'Masquer' : 'Voir détails'}
                </Button>
              </div>
            </CardHeader>
            
            {expandedMember === member.id && (
              <CardContent>
                <div className="space-y-3">
                  {member.assigned_lawyers.length === 0 ? (
                    <p className="text-gray-500 italic">Aucune assignation</p>
                  ) : (
                    member.assigned_lawyers
                      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
                      .map((assignment, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">
                              {assignment.lawyer_nom_complet || assignment.lawyer_prenomnom}
                            </div>
                            {assignment.lawyer_cabinet && (
                              <div className="text-sm text-gray-600">
                                {assignment.lawyer_cabinet}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-500">
                              {formatDate(assignment.assigned_at)}
                            </div>
                            {assignment.lawyer_classement && getClassementBadge(assignment.lawyer_classement)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAssignment(assignment.lawyer_prenomnom, member.id)}
                              disabled={deletingAssignment === `${member.id}:${assignment.lawyer_prenomnom}`}
                              className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                              title="Supprimer cette assignation"
                            >
                              {deletingAssignment === `${member.id}:${assignment.lawyer_prenomnom}` ? (
                                <>⏳ Suppression...</>
                              ) : (
                                <>🗑️ Supprimer</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {teamStats.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune statistique d'équipe disponible</p>
          <Button asChild className="mt-4">
            <Link href="/admin">Configurer l'équipe</Link>
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}