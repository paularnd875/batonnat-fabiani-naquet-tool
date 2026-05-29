'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

export default function AddTeamMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom || !formData.email) {
      setError('Prénom, nom et email sont obligatoires');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/team');
      } else {
        setError(data.error || 'Erreur lors de l\'ajout du collaborateur');
      }
    } catch (error) {
      setError('Erreur de connexion');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      {/* Contenu principal */}
      <div className="container mx-auto px-8 py-6">
        <div className="mb-6">
          <h2 className="text-blue-600 font-bold mb-2">Ajouter un collaborateur</h2>
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">Nouveau membre de l'équipe</span>
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <Link href="/team" className="btn-fn-outline">
            ← Retour à l'équipe
          </Link>
        </div>
      </div>

      {/* Formulaire */}
      <main className="container mx-auto px-8 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="fn-card">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-semibold text-fn-black mb-2 uppercase tracking-wide">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      placeholder="Prénom"
                      className="fn-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="nom" className="block text-sm font-semibold text-fn-black mb-2 uppercase tracking-wide">
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      placeholder="Nom"
                      className="fn-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-fn-black mb-2 uppercase tracking-wide">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="fn-input"
                    required
                  />
                </div>


                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-fn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Ajout en cours...' : 'Ajouter le collaborateur'}
                  </button>
                  
                  <Link href="/team" className="btn-fn-outline">
                    Annuler
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-8 p-6 bg-blue-50 border-l-4 border-fn-blue rounded-md">
            <h4 className="font-semibold text-blue-600 mb-2">💡 Information</h4>
            <p className="text-sm text-gray-700">
              Une fois ajouté, le collaborateur apparaîtra dans la liste de l'équipe et pourra être assigné à des dossiers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}