'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Historique des assignations</h1>
        <p className="text-xl text-gray-600">
          {assignments.length} assignation{assignments.length > 1 ? 's' : ''}
          {searchTerm && ` • ${filteredAssignments.length} résultats pour "${searchTerm}"`}
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 border-b">
          <Button variant="ghost" asChild>
            <Link href="/">Cabinets</Link>
          </Button>
          <Button variant="ghost" className="border-b-2 border-blue-500 text-blue-600 font-semibold">
            Historique
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/recapitulatif">Récapitulatif</Link>
          </Button>
        </div>
        
        <div className="flex gap-4 items-center">
          <Input 
            placeholder="Rechercher un avocat, cabinet ou assigneur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-lg"
          />
          <Button variant="outline" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {currentAssignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    {assignment.lawyer_nom_complet || assignment.lawyer_prenomnom}
                  </CardTitle>
                  <CardDescription>
                    {assignment.lawyer_cabinet && (
                      <span className="text-sm text-gray-600">
                        {assignment.lawyer_cabinet}
                      </span>
                    )}
                    {assignment.lawyer_email && (
                      <span className="ml-2 text-sm text-gray-500">
                        • {assignment.lawyer_email}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="text-right space-y-1">
                  {getStatusBadge(assignment.status)}
                  {assignment.lawyer_classement && getClassementBadge(assignment.lawyer_classement)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Assigné le {formatDate(assignment.assigned_at)}
                  </span>
                  {assignment.assigned_by && (
                    <span className="text-gray-600">
                      par {assignment.assigned_by}
                    </span>
                  )}
                </div>
                {assignment.notes && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {assignment.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm ? `Aucune assignation trouvée pour "${searchTerm}"` : 'Aucune assignation trouvée'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            ⏮ Première
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ← Précédent
          </Button>
          
          <span className="text-sm text-gray-600 px-4">
            Page {currentPage} sur {totalPages} 
            <span className="ml-2 text-xs">
              ({startIndex + 1}-{Math.min(endIndex, filteredAssignments.length)} sur {filteredAssignments.length} assignations)
            </span>
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Suivant →
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Dernière ⏭
          </Button>
        </div>
      )}
    </div>
  );
}