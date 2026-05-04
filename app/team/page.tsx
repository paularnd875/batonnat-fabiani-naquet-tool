'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Edit, Trash2 } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  created_at: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const handleEdit = (member: TeamMember) => {
    // Rediriger vers une page d'édition ou ouvrir un modal
    window.location.href = `/team/edit/${member.id}`;
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
        loadTeamMembers(); // Recharger la liste
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredMembers = teamMembers.filter(member => 
    member.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!mounted) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  // Éviter le rendu pendant l'hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        <FabianiNaquetHeader />
        <div className="container mx-auto px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        <FabianiNaquetHeader />
        <div className="container mx-auto px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Chargement de l'équipe...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      {/* Contenu principal */}
      <div className="container mx-auto px-8 py-6">
        <div className="mb-6">
          <h2 className="text-fn-blue font-bold mb-2">Collaborateurs de l'équipe</h2>
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">{teamMembers.length} collaborateur{teamMembers.length > 1 ? 's' : ''}</span>
            {searchTerm && (
              <span className="text-fn-blue"> • {filteredMembers.length} résultats pour "{searchTerm}"</span>
            )}
          </p>
        </div>

        {/* Barre de recherche et boutons */}
        <div className="flex gap-4 items-center flex-wrap mb-8">
          <div className="flex-1 min-w-[300px] max-w-lg">
            <input
              type="text"
              placeholder="Rechercher un collaborateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fn-input"
            />
          </div>
          <Link href="/team/add" className="btn-fn-primary">
            Ajouter un collaborateur
          </Link>
        </div>
      </div>

      {/* Liste des collaborateurs */}
      <main className="container mx-auto px-8 pb-8">
        <div className="grid gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="fn-card">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-fn-black mb-2">{member.prenom} {member.nom}</h3>
                    <div className="space-y-1">
                      <p className="text-gray-600 font-medium">📧 {member.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-3">
                      Ajouté le {formatDate(member.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier ce collaborateur"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer ce collaborateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message si aucun collaborateur */}
        {filteredMembers.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-fn-black mb-2">Aucun collaborateur trouvé</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun collaborateur dans l\'équipe'}
            </p>
            {teamMembers.length === 0 && (
              <Link href="/team/add" className="btn-fn-primary">
                Ajouter le premier collaborateur
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}