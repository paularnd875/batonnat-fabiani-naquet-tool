'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Trash2, Mail, Calendar, Building2, TrendingUp } from 'lucide-react';

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

export default function StatisticsTab() {
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
    const assignment = teamStats
      .flatMap(member => member.assigned_lawyers)
      .find(lawyer => lawyer.lawyer_prenomnom === lawyerPrenomnom);

    const lawyerName = assignment?.lawyer_nom_complet || lawyerPrenomnom;
    const cabinet = assignment?.lawyer_cabinet ? ` (${assignment.lawyer_cabinet})` : '';

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'assignation de :\n\n${lawyerName}${cabinet}\n\nCette action est irréversible.`)) {
      return;
    }

    // Clé de chargement par couple (membre, avocat) : multi-soutiens possible.
    setDeletingAssignment(teamMemberId ? `${teamMemberId}:${lawyerPrenomnom}` : lawyerPrenomnom);

    try {
      const response = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyer_prenomnom: lawyerPrenomnom,
          ...(teamMemberId ? { team_member_id: teamMemberId } : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadTeamStats();
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-blue-600">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total assignations</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 stats-numbers">{getTotalAssignments()}</div>
            <p className="text-xs text-gray-500 mt-1">
              Réparties sur {teamStats.length} membre{teamStats.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Moyenne par membre</CardTitle>
            <TrendingUp className="h-5 w-5 text-fn-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-fn-yellow stats-numbers">
              {teamStats.length > 0 ? Math.round(getTotalAssignments() / teamStats.length) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Assignations en moyenne
            </p>
          </CardContent>
        </Card>

        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Membre le plus actif</CardTitle>
            <TrendingUp className="h-5 w-5 text-fn-red" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-fn-red stats-numbers">
              {Math.max(...teamStats.map(m => m.total_assignments), 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {teamStats.find(m => m.total_assignments === Math.max(...teamStats.map(s => s.total_assignments)))?.prenom || 'Aucun'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détails par membre */}
      <div>
        <h2 className="text-2xl font-bold text-fn-black mb-4">Détail des assignations par membre</h2>
        
        <div className="space-y-4">
          {teamStats.map((member) => (
            <Card key={member.id} className="fn-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-fn-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {member.prenom?.[0]?.toUpperCase()}{member.nom?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-fn-black">
                        {member.prenom} {member.nom}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 stats-numbers">
                        {member.total_assignments}
                      </div>
                      <div className="text-sm text-gray-500">
                        assignation{member.total_assignments > 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => setExpandedMember(
                        expandedMember === member.id ? null : member.id
                      )}
                      className="icon-hover focus-ring"
                    >
                      {expandedMember === member.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedMember === member.id && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-700 mb-3">
                        Avocats assignés ({member.assigned_lawyers.length})
                      </h4>
                      
                      {member.assigned_lawyers.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Aucun avocat assigné</p>
                      ) : (
                        <div className="space-y-3">
                          {member.assigned_lawyers.map((assignment, index) => (
                            <div
                              key={`${assignment.lawyer_prenomnom}-${index}`}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {assignment.lawyer_nom_complet || assignment.lawyer_prenomnom}
                                </div>
                                
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  {assignment.lawyer_cabinet && (
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {assignment.lawyer_cabinet}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(assignment.assigned_at)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                {getClassementBadge(assignment.lawyer_classement)}
                                
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(assignment.lawyer_prenomnom, member.id)}
                                  disabled={deletingAssignment === `${member.id}:${assignment.lawyer_prenomnom}`}
                                  className="icon-hover focus-ring"
                                >
                                  {deletingAssignment === `${member.id}:${assignment.lawyer_prenomnom}` ? (
                                    <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {teamStats.length === 0 && (
            <Card className="fn-card">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune statistique disponible</h3>
                  <p className="text-gray-500">
                    Les statistiques apparaîtront une fois que vous aurez commencé à faire des assignations
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}