'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Mail, User, Users, ArrowLeft, Send, Check, Plus, Trash2, UserPlus, RefreshCw, Database, UsersRound } from 'lucide-react';
import Link from 'next/link';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  assignment_count?: number;
}

interface AssignmentStats {
  total_assignments: number;
  total_assigned_lawyers: number;
  total_unassigned: number;
  total_lawyers: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  blacklist_count: number;
  soutien_public_count: number;
  total_team_members: number;
  team_coverage: {
    [key: string]: number;
  };
}

export default function AdminPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailResults, setEmailResults] = useState<string[]>([]);
  
  // États pour la gestion des membres d'équipe
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({ prenom: '', nom: '', email: '' });
  const [addingMember, setAddingMember] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<string[]>([]);
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger les statistiques VRAIES depuis Google Sheets (inclut aussi team_members)
      const statsResponse = await fetch('/api/admin-stats');
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
        setTeamMembers(statsData.team_members || []);
      }

    } catch (error) {
      console.error('Erreur chargement données admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendIndividualRecap = async (teamMemberId: string, memberName: string) => {
    setSendingEmail(teamMemberId);
    
    try {
      const response = await fetch('/api/send-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_member_id: teamMemberId,
          type: 'individual',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailResults(prev => [...prev, `✅ ${memberName}: ${data.message}`]);
      } else {
        setEmailResults(prev => [...prev, `❌ ${memberName}: ${data.error}`]);
      }
    } catch (error) {
      setEmailResults(prev => [...prev, `❌ ${memberName}: Erreur envoi`]);
      console.error('Erreur envoi email:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  const sendGlobalRecap = async () => {
    setSendingEmail('global');
    
    try {
      const response = await fetch('/api/send-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'global' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailResults(prev => [
          ...prev, 
          `✅ Envoi global: ${data.message}`,
          ...(data.sent_emails || []).map((email: any) => 
            `  • ${email.member} (${email.assignments_count} assignations)`
          )
        ]);
      } else {
        setEmailResults(prev => [...prev, `❌ Envoi global: ${data.error}`]);
      }
    } catch (error) {
      setEmailResults(prev => [...prev, `❌ Envoi global: Erreur serveur`]);
      console.error('Erreur envoi global:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  const addTeamMember = async () => {
    if (!newMember.prenom || !newMember.nom || !newMember.email) {
      setEmailResults(prev => [...prev, '❌ Tous les champs sont requis']);
      return;
    }

    setAddingMember(true);

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      const data = await response.json();

      if (data.success) {
        setEmailResults(prev => [...prev, `✅ Membre ajouté: ${newMember.prenom} ${newMember.nom}`]);
        setNewMember({ prenom: '', nom: '', email: '' });
        setShowAddDialog(false);
        loadData(); // Recharger les données
      } else {
        setEmailResults(prev => [...prev, `❌ Erreur ajout: ${data.error}`]);
      }
    } catch (error) {
      setEmailResults(prev => [...prev, '❌ Erreur serveur lors de l\'ajout']);
      console.error('Erreur ajout membre:', error);
    } finally {
      setAddingMember(false);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    setSyncResults(['🔄 Début de la synchronisation...']);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('Réponse sync API:', data);

      if (data.success) {
        setSyncResults(prev => [
          ...prev,
          `✅ Synchronisation réussie !`,
          `📊 ${data.stats?.lawyers_synced || 'N/A'} avocats synchronisés`,
          `🏢 ${data.stats?.firms_updated || 'N/A'} cabinets mis à jour`
        ]);
        
        // Recharger les données
        loadData();
      } else {
        setSyncResults(prev => [...prev, `❌ Erreur synchronisation: ${data.error || 'Erreur inconnue'}`]);
      }
    } catch (error) {
      setSyncResults(prev => [...prev, '❌ Erreur serveur lors de la synchronisation']);
      console.error('Erreur synchronisation:', error);
    } finally {
      setSyncing(false);
    }
  };

  const createTeamFromOrigins = async () => {
    setCreatingTeam(true);
    setSyncResults(prev => [...prev, '👥 Création des membres d\'équipe depuis les origines...']);

    try {
      const response = await fetch('/api/create-team-from-origins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('Réponse create-team-from-origins:', data);

      if (data.success) {
        setSyncResults(prev => [
          ...prev,
          `✅ ${data.created_count} membres d'équipe créés automatiquement`,
          `📋 Origines trouvées: ${data.origines_found?.join(', ') || 'Aucune'}`,
          ...data.members_created?.map((member: any) => 
            `  • ${member.prenom} ${member.nom} (${member.email})`
          ) || []
        ]);
        
        // Recharger les données
        loadData();
      } else {
        setSyncResults(prev => [...prev, `❌ Erreur création équipe: ${data.error || 'Erreur inconnue'}`]);
      }
    } catch (error) {
      setSyncResults(prev => [...prev, '❌ Erreur serveur lors de la création d\'équipe']);
      console.error('Erreur création équipe:', error);
    } finally {
      setCreatingTeam(false);
    }
  };

  const deleteTeamMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${memberName} ?`)) {
      return;
    }

    setDeletingMember(memberId);

    try {
      const response = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_member_id: memberId }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailResults(prev => [...prev, `✅ Membre supprimé: ${memberName}`]);
        loadData(); // Recharger les données
      } else {
        setEmailResults(prev => [...prev, `❌ Erreur suppression: ${data.error}`]);
      }
    } catch (error) {
      setEmailResults(prev => [...prev, '❌ Erreur serveur lors de la suppression']);
      console.error('Erreur suppression membre:', error);
    } finally {
      setDeletingMember(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement interface admin...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto p-8">
      {/* En-tête */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          asChild
          className="mb-4"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux cabinets
          </Link>
        </Button>
        
        <h1 className="text-4xl font-bold mb-2">Administration</h1>
        <p className="text-xl text-gray-600">Gestion des assignations et envoi d'emails</p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.total_assigned_lawyers} / {stats.total_lawyers}
              </div>
              <p className="text-sm text-gray-600">Avocats assignés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.c1_count || 0}</div>
              <p className="text-sm text-gray-600">C1</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.c2_count || 0}</div>
              <p className="text-sm text-gray-600">C2</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">{stats.c3_count || 0}</div>
              <p className="text-sm text-gray-600">C3</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{stats.soutien_public_count || 0}</div>
              <p className="text-sm text-gray-600">Soutiens publics</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{stats.blacklist_count || 0}</div>
              <p className="text-sm text-gray-600">Blacklist</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">{teamMembers.length}</div>
              <p className="text-sm text-gray-600">Membres d'équipe</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Synchronisation des données */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Synchronisation des données
          </CardTitle>
          <CardDescription>
            Synchronisez les données depuis Google Sheets vers la base de données et créez automatiquement les membres d'équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={syncData}
              disabled={syncing || creatingTeam}
              className="flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synchronisation en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Synchroniser les données
                </>
              )}
            </Button>
            
            <Button 
              onClick={createTeamFromOrigins}
              disabled={syncing || creatingTeam}
              variant="outline"
              className="flex items-center gap-2"
            >
              {creatingTeam ? (
                <>
                  <UsersRound className="w-4 h-4 animate-pulse" />
                  Création en cours...
                </>
              ) : (
                <>
                  <UsersRound className="w-4 h-4" />
                  Créer équipe depuis origines
                </>
              )}
            </Button>
          </div>
          
          {/* Résultats de synchronisation */}
          {syncResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {syncResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-sm ${
                    result.includes('✅') 
                      ? 'bg-green-50 text-green-700' 
                      : result.includes('❌')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {result}
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSyncResults([])}
                className="mt-2"
              >
                Effacer les résultats
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Envoi d'emails récapitulatifs
          </CardTitle>
          <CardDescription>
            Envoyez des récapitulatifs personnalisés aux membres de l'équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={sendGlobalRecap}
              disabled={sendingEmail !== null}
              className="flex items-center gap-2"
            >
              {sendingEmail === 'global' ? (
                <>🔄 Envoi en cours...</>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Envoyer à toute l'équipe
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Équipe */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Membres d'équipe ({teamMembers.length})
            </CardTitle>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un membre d'équipe</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations du nouveau membre de l'équipe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Prénom</label>
                    <Input
                      value={newMember.prenom}
                      onChange={(e) => setNewMember(prev => ({ ...prev, prenom: e.target.value }))}
                      placeholder="Marie-Hélène"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input
                      value={newMember.nom}
                      onChange={(e) => setNewMember(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Fabiani"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="marie.fabiani@batonnat2026.fr"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewMember({ prenom: '', nom: '', email: '' });
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={addTeamMember}
                    disabled={addingMember}
                  >
                    {addingMember ? '🔄 Ajout...' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {teamMembers.map((member) => {
              const assignmentCount = stats?.team_coverage[member.id] || 0;
              
              return (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{member.prenom} {member.nom}</h3>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    <Badge variant="outline" className="mt-1">
                      {assignmentCount} assignation{assignmentCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendIndividualRecap(member.id, `${member.prenom} ${member.nom}`)}
                      disabled={sendingEmail !== null || assignmentCount === 0}
                      className="flex items-center gap-2"
                    >
                      {sendingEmail === member.id ? (
                        <>🔄 Envoi...</>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Envoyer récap
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTeamMember(member.id, `${member.prenom} ${member.nom}`)}
                      disabled={deletingMember !== null}
                      className="flex items-center gap-2"
                    >
                      {deletingMember === member.id ? (
                        <>🔄 Suppression...</>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Résultats envoi */}
      {emailResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Résultats d'envoi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              {emailResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded ${
                    result.includes('✅') 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEmailResults([])}
              className="mt-4"
            >
              Effacer les résultats
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}