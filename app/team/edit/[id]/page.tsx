'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  created_at: string;
}

export default function EditTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  
  const [member, setMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMember();
  }, []);

  const loadMember = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();
      
      if (data.success) {
        const foundMember = data.team_members.find((m: TeamMember) => m.id === memberId);
        if (foundMember) {
          setMember(foundMember);
          setFormData({
            prenom: foundMember.prenom,
            nom: foundMember.nom,
            email: foundMember.email,
          });
        } else {
          alert('Collaborateur non trouvé');
          router.back();
        }
      }
    } catch (error) {
      console.error('Erreur chargement collaborateur:', error);
      alert('Erreur lors du chargement');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom || !formData.email) {
      alert('Tous les champs sont requis');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Collaborateur mis à jour avec succès');
        router.push('/team');
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto px-8 py-6">
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-fn-blue hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'équipe
          </button>
          
          <h2 className="text-fn-blue font-bold mb-2">Modifier un collaborateur</h2>
          <p className="text-lg text-gray-600 font-medium">
            Modification de <span className="decorative-text">{member?.prenom} {member?.nom}</span>
          </p>
        </div>

        <div className="max-w-md">
          <form onSubmit={handleSubmit} className="fn-card p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-fn-black mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                  className="fn-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-fn-black mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="fn-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fn-black mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="fn-input"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-fn-primary flex-1"
                >
                  {saving ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-fn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}