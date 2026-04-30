'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface Assignment {
  id: string;
  lawyer_prenomnom: string;
  assigned_at: string;
  assigned_by: string;
  status: string;
  notes?: string;
  // Informations de l'avocat (jointes)
  lawyer_nom_complet?: string;
  lawyer_cabinet?: string;
  lawyer_classement?: string;
  lawyer_email?: string;
}

export default function HistoriquePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const assignmentsPerPage = 20;

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const response = await fetch('/api/assignments');
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments || []);
      } else {
        console.error('Erreur API:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => 
    assignment.lawyer_prenomnom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (assignment.lawyer_cabinet && assignment.lawyer_cabinet.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (assignment.assigned_by && assignment.assigned_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcul de la pagination
  const totalPages = Math.ceil(filteredAssignments.length / assignmentsPerPage);
  const startIndex = (currentPage - 1) * assignmentsPerPage;
  const endIndex = startIndex + assignmentsPerPage;
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Reset page lors d'une recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'assigned': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status === 'assigned' ? 'Assigné' : 
         status === 'completed' ? 'Terminé' :
         status === 'cancelled' ? 'Annulé' : status}
      </Badge>
    );
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

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement de l'historique...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header Fabiani-Naquet avec style Mondrian */}
      <FabianiNaquetHeader />
      
      {/* Contenu principal avec informations et recherche */}
      <div className="container mx-auto px-8 py-6">
        <div className="mb-6">
          <h2 className="text-fn-blue font-bold mb-2">Historique des assignations</h2>
          <p className="text-lg text-gray-600 font-medium">
            <span className="decorative-text">{assignments.length} assignation{assignments.length > 1 ? 's' : ''}</span>
            {searchTerm && (
              <span className="text-fn-blue"> • {filteredAssignments.length} résultats pour "{searchTerm}"</span>
            )}
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="flex gap-4 items-center flex-wrap mb-8">
          <div className="flex-1 min-w-[300px] max-w-xl">
            <input
              type="text"
              placeholder="Rechercher un avocat, cabinet ou assigneur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="fn-input"
            />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="container mx-auto px-8 pb-8">

        {/* Liste des assignations avec style Fabiani-Naquet */}
        <div className="grid gap-6">
          {currentAssignments.map((assignment) => (
            <div key={assignment.id} className="fn-card">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-fn-black mb-2">
                      {assignment.lawyer_nom_complet || assignment.lawyer_prenomnom}
                    </h3>
                    <div className="space-y-1">
                      {assignment.lawyer_cabinet && (
                        <p className="text-gray-600 font-medium">
                          {assignment.lawyer_cabinet}
                        </p>
                      )}
                      {assignment.lawyer_email && (
                        <p className="text-sm text-gray-500">
                          📧 {assignment.lawyer_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    {assignment.status === 'assigned' ? (
                      <span className="fn-badge" style={{backgroundColor: 'var(--fn-blue)', color: 'var(--fn-white)'}}>
                        Assigné
                      </span>
                    ) : assignment.status === 'completed' ? (
                      <span className="fn-badge" style={{backgroundColor: 'var(--fn-yellow)', color: 'var(--fn-black)'}}>
                        Terminé
                      </span>
                    ) : assignment.status === 'cancelled' ? (
                      <span className="fn-badge fn-badge-bl">
                        Annulé
                      </span>
                    ) : (
                      <span className="fn-badge" style={{backgroundColor: 'var(--fn-gray-medium)', color: 'var(--fn-white)'}}>
                        {assignment.status}
                      </span>
                    )}
                    {assignment.lawyer_classement && (
                      <div>
                        {assignment.lawyer_classement === 'C1' && (
                          <span className="fn-badge fn-badge-c1">C1</span>
                        )}
                        {assignment.lawyer_classement === 'C2' && (
                          <span className="fn-badge fn-badge-c2">C2</span>
                        )}
                        {assignment.lawyer_classement === 'C3' && (
                          <span className="fn-badge fn-badge-c3">C3</span>
                        )}
                        {assignment.lawyer_classement === 'Blacklist' && (
                          <span className="fn-badge fn-badge-bl">Blacklist</span>
                        )}
                        {!['C1', 'C2', 'C3', 'Blacklist'].includes(assignment.lawyer_classement) && (
                          <span className="fn-badge" style={{backgroundColor: 'var(--fn-gray-medium)', color: 'var(--fn-white)'}}>
                            {assignment.lawyer_classement}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Informations de l'assignation */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">
                      📅 Assigné le {formatDate(assignment.assigned_at)}
                    </span>
                    {assignment.assigned_by && (
                      <span className="text-fn-blue font-medium">
                        👤 par {assignment.assigned_by}
                      </span>
                    )}
                  </div>
                  {assignment.notes && (
                    <div className="bg-gray-50 p-3 rounded-md border-l-4 border-fn-yellow">
                      <p className="text-sm text-gray-700 italic">
                        "{assignment.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message si aucune assignation */}
        {filteredAssignments.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-fn-black mb-2">Aucune assignation trouvée</h3>
            <p className="text-gray-500">
              {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucune assignation disponible'}
            </p>
          </div>
        )}

        {/* Pagination avec style Fabiani-Naquet */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-3">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏮ Première
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            
            <div className="bg-white px-4 py-2 rounded-md border-2 border-gray-200 text-sm font-medium">
              <span className="text-fn-blue font-semibold">Page {currentPage}</span>
              <span className="text-gray-500"> sur {totalPages}</span>
              <div className="text-xs text-gray-400 mt-1">
                ({startIndex + 1}-{Math.min(endIndex, filteredAssignments.length)} sur {filteredAssignments.length} assignations)
              </div>
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-fn-outline text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dernière ⏭
            </button>
          </div>
        )}
      </main>
    </div>
  );
}