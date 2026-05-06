'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit, Trash2, UserPlus, Mail, Calendar, Search } from 'lucide-react';

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  created_at: string;
  assignment_count?: number;
}

export default function TeamTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour l'ajout de membres
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({ prenom: '', nom: '', email: '' });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();
      
      if (data.success) {
        setTeamMembers(data.team_members || []);
      } else {
        console.error('Erreur API:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${member.prenom} ${member.nom} ?`)) {
      return;
    }

    try {
      const response = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_member_id: member.id }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Collaborateur supprimé avec succès');
        loadTeamMembers();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const addTeamMember = async () => {
    if (!newMember.prenom || !newMember.nom || !newMember.email) {
      alert('Veuillez remplir tous les champs');
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
        setNewMember({ prenom: '', nom: '', email: '' });
        setShowAddDialog(false);
        loadTeamMembers();
        alert('Collaborateur ajouté avec succès');
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur ajout membre:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      setAddingMember(false);
    }
  };

  const filteredMembers = teamMembers.filter(member => 
    member.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-fn-blue">Chargement de l'équipe...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête et actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-fn-black mb-2">Gestion de l'équipe</h2>
          <p className="text-gray-600">{teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} dans l'équipe</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="btn-fn-primary icon-hover focus-ring flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Ajouter un collaborateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un collaborateur</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau membre à l'équipe Fabiani-Naquet
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prénom</label>
                <Input
                  placeholder="Prénom du collaborateur"
                  value={newMember.prenom}
                  onChange={(e) => setNewMember({...newMember, prenom: e.target.value})}
                  className="focus-ring"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom</label>
                <Input
                  placeholder="Nom du collaborateur"
                  value={newMember.nom}
                  onChange={(e) => setNewMember({...newMember, nom: e.target.value})}
                  className="focus-ring"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@fabianinaquet.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  className="focus-ring"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                className="icon-hover focus-ring"
              >
                Annuler
              </Button>
              <Button 
                onClick={addTeamMember}
                disabled={addingMember}
                className="btn-fn-primary icon-hover focus-ring"
              >
                {addingMember ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barre de recherche */}
      <Card className="fn-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 focus-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="fn-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fn-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {member.prenom?.[0]?.toUpperCase()}{member.nom?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-fn-black">
                      {member.prenom} {member.nom}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Ajouté le {formatDate(member.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.assignment_count !== undefined && (
                    <div className="px-3 py-1 bg-fn-blue text-white rounded-full text-sm font-medium stats-numbers">
                      {member.assignment_count} assignations
                    </div>
                  )}
                  
                  <Link href={`/team/edit/${member.id}`}>
                    <Button variant="outline" size="sm" className="icon-hover focus-ring">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(member)}
                    className="icon-hover focus-ring"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredMembers.length === 0 && (
          <Card className="fn-card">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Aucun membre trouvé' : 'Aucun membre dans l\'équipe'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? `Aucun résultat pour "${searchTerm}"` 
                    : 'Commencez par ajouter des collaborateurs à votre équipe'
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowAddDialog(true)}
                    className="btn-fn-primary icon-hover focus-ring"
                  >
                    Ajouter le premier collaborateur
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}