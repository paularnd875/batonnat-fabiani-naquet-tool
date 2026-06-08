'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Users, Plus, Loader2, UserPlus, Mail, Phone } from 'lucide-react';

interface TeamMember {
  id: string | number;
  nom: string;
  prenom: string;
  email: string;
}

export default function UserSelectionPage() {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | number | null>(null);
  const [error, setError] = useState('');
  
  // États pour le formulaire de création
  const [newUser, setNewUser] = useState({
    nom: '',
    prenom: '',
    email: ''
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des utilisateurs');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (userId: string | number) => {
    try {
      setSelectedUser(userId);
      
      const response = await fetch('/api/auth/select-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Erreur lors de la sélection');
        setSelectedUser(null);
      }
    } catch (error) {
      setError('Erreur de connexion');
      setSelectedUser(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.nom.trim() || !newUser.prenom.trim() || !newUser.email.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsCreatingUser(true);
      setError('');

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (data.success) {
        // Sélectionner automatiquement l'utilisateur créé
        await handleUserSelect(data.user.id);
      } else {
        setError(data.error || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewUser({ nom: '', prenom: '', email: '' });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <div 
              className="text-lg sm:text-2xl font-bold text-black uppercase tracking-wide px-2"
              style={{ fontFamily: "var(--font-resolve)" }}
            >
              BÂTONNAT FABIANI-NAQUET 2026
            </div>
            {/* Bande de couleurs Mondrian */}
            <div className="flex h-1 mt-3 sm:mt-4 mx-4 sm:mx-8">
              <div className="flex-1 bg-blue-600"></div>
              <div className="flex-1 bg-white"></div>
              <div className="flex-1 bg-yellow-400"></div>
              <div className="flex-1 bg-red-600"></div>
              <div className="flex-1 bg-black"></div>
            </div>
          </div>
          
          <h1 className="text-lg sm:text-xl font-semibold text-fn-black mb-2">
            {showCreateForm ? 'Créer un nouveau compte' : 'Sélectionnez votre profil'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            {showCreateForm 
              ? 'Remplissez vos informations pour créer votre compte'
              : 'Choisissez votre nom dans la liste ou créez un nouveau compte'
            }
          </p>
        </div>

        <div className="fn-card">
          <div className="p-4 sm:p-8">
            
            {!showCreateForm ? (
              // Liste des utilisateurs existants
              <>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-fn-primary" />
                    <p className="text-gray-600">Chargement des utilisateurs...</p>
                  </div>
                ) : (
                  <>
                    {users.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <h3 className="font-medium text-fn-black flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Membres de l'équipe
                        </h3>
                        
                        <div className="grid gap-3">
                          {users.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleUserSelect(user.id)}
                              disabled={selectedUser === user.id}
                              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="bg-fn-primary text-white rounded-full p-2">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-fn-black">
                                  {user.prenom} {user.nom}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </div>
                              </div>
                              {selectedUser === user.id && (
                                <Loader2 className="h-5 w-5 animate-spin text-fn-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bouton pour créer un nouveau compte */}
                    <div className="border-t border-gray-200 pt-6">
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn-fn-secondary w-full flex items-center justify-center gap-2 py-3"
                      >
                        <UserPlus className="h-5 w-5" />
                        Créer un nouveau compte
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              // Formulaire de création d'utilisateur
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-fn-black mb-2">
                      Prénom *
                    </label>
                    <input
                      id="prenom"
                      type="text"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser(prev => ({ ...prev, prenom: e.target.value }))}
                      placeholder="Votre prénom..."
                      className="fn-input"
                      disabled={isCreatingUser}
                      autoFocus
                    />
                  </div>

                  {/* Nom */}
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-fn-black mb-2">
                      Nom *
                    </label>
                    <input
                      id="nom"
                      type="text"
                      value={newUser.nom}
                      onChange={(e) => setNewUser(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Votre nom..."
                      className="fn-input"
                      disabled={isCreatingUser}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-fn-black mb-2">
                    Adresse email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="votre.email@exemple.com"
                    className="fn-input"
                    disabled={isCreatingUser}
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    disabled={isCreatingUser}
                    className="btn-fn-secondary flex-1 py-3"
                  >
                    Retour à la liste
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="btn-fn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        Créer et me connecter
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <User className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Note de sécurité */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Vos informations sont sécurisées et utilisées uniquement pour le suivi des modifications
          </p>
        </div>
      </div>
    </div>
  );
}