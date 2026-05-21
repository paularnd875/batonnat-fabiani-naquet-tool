'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Database, UserPlus, Mail, Send, RefreshCw, Check, TestTube } from 'lucide-react';
import Link from 'next/link';

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

interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  assignment_count?: number;
}

export default function OverviewTab() {
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailResults, setEmailResults] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/admin-stats?refresh=true' : '/api/admin-stats';
      const statsResponse = await fetch(url);
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
        // Rafraîchir les données après l'envoi pour mettre à jour l'aperçu de l'équipe
        loadData(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-blue-600">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Avocats</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-fn-black stats-numbers">{stats?.total_lawyers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.total_assigned_lawyers || 0} assignés • {stats?.total_unassigned || 0} non assignés
            </p>
          </CardContent>
        </Card>

        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Soutiens Publics</CardTitle>
            <Check className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 stats-numbers">{stats?.soutien_public_count || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Soutiens confirmés à F&N
            </p>
          </CardContent>
        </Card>

        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Assignations</CardTitle>
            <Database className="h-5 w-5 text-fn-red" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-fn-red stats-numbers">{stats?.total_assignments || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Répartitions effectuées
            </p>
          </CardContent>
        </Card>

        <Card className="fn-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Équipe</CardTitle>
            <UserPlus className="h-5 w-5 text-fn-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-fn-yellow stats-numbers">{teamMembers.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Membres actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classifications détaillées */}
      <Card className="fn-card">
        <CardHeader>
          <CardTitle className="text-fn-black">Classifications des Avocats</CardTitle>
          <CardDescription>Répartition par catégorie selon l'analyse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">C1</p>
                <p className="text-2xl font-bold text-green-600 stats-numbers">{stats?.c1_count || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">C2</p>
                <p className="text-2xl font-bold text-blue-600 stats-numbers">{stats?.c2_count || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">C3</p>
                <p className="text-2xl font-bold text-yellow-600 stats-numbers">{stats?.c3_count || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Blacklist</p>
                <p className="text-2xl font-bold text-red-600 stats-numbers">{stats?.blacklist_count || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Envoi des récapitulatifs */}
        <Card className="fn-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fn-black">
              <Send className="h-5 w-5" />
              Envoi des Récapitulatifs
            </CardTitle>
            <CardDescription>Envoyer les assignations aux membres de l'équipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={sendGlobalRecap}
              disabled={sendingEmail === 'global'}
              className="btn-fn-primary w-full icon-hover focus-ring flex items-center justify-center gap-2"
            >
              {sendingEmail === 'global' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Envoyer à toute l'équipe
                </>
              )}
            </button>
            
            {emailResults.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 mb-2">Résultats des envois :</h4>
                {emailResults.map((result, index) => (
                  <p key={index} className="text-sm text-gray-600 mb-1">{result}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aperçu de l'équipe */}
        <Card className="fn-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fn-black">
              <Users className="h-5 w-5" />
              Aperçu de l'équipe
            </CardTitle>
            <CardDescription>Membres avec leurs assignations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{member.prenom} {member.nom}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <Badge variant="secondary" className="stats-numbers">
                    {member.assignment_count || 0} assignations
                  </Badge>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Aucun membre d'équipe</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Outils de développement */}
        <Card className="fn-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fn-black">
              <TestTube className="h-5 w-5" />
              Outils de développement
            </CardTitle>
            <CardDescription>Accès aux outils de test et de debug</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link 
              href="/test" 
              className="btn-fn-outline w-full icon-hover focus-ring flex items-center justify-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test API
            </Link>
            <p className="text-xs text-gray-500">
              Interface de test pour vérifier le fonctionnement des APIs et effectuer des diagnostics.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}