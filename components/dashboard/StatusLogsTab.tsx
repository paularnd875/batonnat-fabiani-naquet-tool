'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  FileText,
  Loader2,
  Database,
  RefreshCw
} from 'lucide-react';
import { StatusChangeLog } from '@/lib/database';

interface DashboardStats {
  totalLogs: number;
  todayLogs: number;
  unexportedLogs: number;
  usersCount: number;
}

const StatusLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<StatusChangeLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [markingAsUpdated, setMarkingAsUpdated] = useState(false);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Charger les logs et statistiques en parallèle
      const [logsResponse, statsResponse] = await Promise.all([
        fetch('/api/status-logs'),
        fetch('/api/admin-stats')
      ]);

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'export CSV
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `changements_statuts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Recharger les données après export
        fetchData();
      } else {
        console.error('Erreur lors de l\'export CSV');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Fonction de marquer comme MAJ dans la BDD
  const handleMarkAsUpdated = async () => {
    setMarkingAsUpdated(true);
    try {
      const response = await fetch('/api/mark-as-updated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Recharger les données
        fetchData();
      } else {
        console.error('Erreur lors du marquage comme MAJ');
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    } finally {
      setMarkingAsUpdated(false);
    }
  };

  // Filtrage des logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.lawyer_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.lawyer_prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.lawyer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.lawyer_cabinet.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || 
      log.old_status.includes(statusFilter) || 
      log.new_status.includes(statusFilter);
    
    const matchesUser = !userFilter || 
      log.changed_by_name.toLowerCase().includes(userFilter.toLowerCase());
    
    const matchesDate = !dateFilter || 
      log.changed_at.startsWith(dateFilter);
    
    return matchesSearch && matchesStatus && matchesUser && matchesDate;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'C1': return 'bg-green-100 text-green-800';
      case 'C2': return 'bg-blue-100 text-blue-800';
      case 'C3': return 'bg-yellow-100 text-yellow-800';
      case 'Blacklist': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span className="text-lg">Chargement des logs de statut...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h2 className="text-3xl font-bold text-fn-black mb-2" style={{ fontFamily: "var(--font-resolve)" }}>
          📊 CHANGEMENTS DE STATUT
        </h2>
        <p className="text-gray-600">
          Suivi et export des modifications de statut des avocats
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-2 border-gray-100 hover:border-fn-blue transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Total Logs
                </p>
                <p className="text-3xl font-bold text-fn-black" style={{ fontFamily: "var(--font-resolve)" }}>
                  {stats.totalLogs}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-gray-100 hover:border-green-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Aujourd'hui
                </p>
                <p className="text-3xl font-bold text-fn-black" style={{ fontFamily: "var(--font-resolve)" }}>
                  {stats.todayLogs}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-gray-100 hover:border-fn-yellow transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Database className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Non exportés
                </p>
                <p className="text-3xl font-bold text-fn-black" style={{ fontFamily: "var(--font-resolve)" }}>
                  {stats.unexportedLogs}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-gray-100 hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  Utilisateurs
                </p>
                <p className="text-3xl font-bold text-fn-black" style={{ fontFamily: "var(--font-resolve)" }}>
                  {stats.usersCount}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleExportCSV} 
          disabled={exportLoading}
          className="bg-fn-blue hover:bg-fn-blue/90 text-white font-bold text-sm uppercase tracking-wider px-6 py-3"
          style={{ fontFamily: "var(--font-resolve)" }}
        >
          {exportLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </>
          )}
        </Button>

        <Button 
          onClick={handleMarkAsUpdated}
          disabled={markingAsUpdated}
          className="bg-fn-yellow hover:bg-fn-yellow/90 text-black font-bold text-sm uppercase tracking-wider px-6 py-3"
          style={{ fontFamily: "var(--font-resolve)" }}
        >
          {markingAsUpdated ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Marquage...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Marquer comme MAJ dans la BDD
            </>
          )}
        </Button>

        <Button 
          onClick={fetchData}
          variant="outline"
          className="border-2 border-gray-300 font-bold text-sm uppercase tracking-wider px-6 py-3 hover:border-fn-blue hover:text-fn-blue"
          style={{ fontFamily: "var(--font-resolve)" }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-6 border-2 border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-fn-blue" />
          <h3 className="text-lg font-bold text-fn-black uppercase tracking-wider" style={{ fontFamily: "var(--font-resolve)" }}>
            Filtres de recherche
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Recherche globale
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Nom, prénom, email, cabinet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 focus:border-fn-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-fn-blue"
            >
              <option value="">Tous les statuts</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="C3">C3</option>
              <option value="Blacklist">Blacklist</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Utilisateur
            </label>
            <Input
              placeholder="Nom utilisateur..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border-2 focus:border-fn-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Date
            </label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border-2 focus:border-fn-blue"
            />
          </div>
        </div>
      </Card>

      {/* Tableau des logs */}
      <Card className="p-6 border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-fn-black uppercase tracking-wider" style={{ fontFamily: "var(--font-resolve)" }}>
            Historique des changements ({filteredLogs.length} résultats)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-200">
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Date/Heure</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Avocat</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Email</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Cabinet</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Ancien Statut</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Nouveau Statut</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Modifié par</TableHead>
                <TableHead className="font-bold text-fn-black uppercase tracking-wider">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-blue-50 transition-colors">
                  <TableCell className="text-sm font-medium">
                    {formatDate(log.changed_at)}
                  </TableCell>
                  <TableCell className="font-bold">
                    {log.lawyer_prenom} {log.lawyer_nom}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {log.lawyer_email}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.lawyer_cabinet}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(log.old_status)}>
                      {log.old_status || 'Non classifié'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(log.new_status)}>
                      {log.new_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.changed_by_name}
                  </TableCell>
                  <TableCell>
                    {log.exported_at ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        ✅ Exporté
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                        ⏳ En attente
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Aucun log trouvé</p>
              <p className="text-sm">Essayez d'ajuster vos filtres de recherche</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StatusLogsTab;