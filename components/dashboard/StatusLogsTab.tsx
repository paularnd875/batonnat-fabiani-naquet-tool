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
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  Edit
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  
  // États pour la sélection multiple
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchData();
  }, []);

  // 🔄 NOUVEAU: Écouter les changements localStorage pour la synchronisation
  useEffect(() => {
    const handleStatusChange = (event: any) => {
      console.log(' StatusLogs: Changement de statut détecté, rechargement des logs...');
      fetchData();
    };

    // Écouter les événements de changement de statut
    window.addEventListener('lawyerStatusChanged', handleStatusChange);

    return () => {
      window.removeEventListener('lawyerStatusChanged', handleStatusChange);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔄 NOUVEAU: Récupérer les données localStorage pour les fusionner
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      const localStorageChanges = statusChangesStorage.getUnexportedChanges();
      const localStorageStatuses = statusChangesStorage.getCurrentStatuses();
      
      console.log(` StatusLogs: Récupération ${localStorageChanges.length} changements localStorage non exportés`);
      
      // Charger les logs SQLite et statistiques avec localStorage en parallèle
      const [logsResponse, statsResponse] = await Promise.all([
        fetch('/api/status-logs'),
        fetch('/api/admin-stats-with-localstorage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            localStorageStatuses,
            localStorageChanges
          })
        })
      ]);

      // Fusionner les logs SQLite avec les changements localStorage
      let allLogs: any[] = [];
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        const sqliteLogs = logsData.logs || [];
        console.log(` StatusLogs: ${sqliteLogs.length} logs SQLite récupérés`);
        allLogs.push(...sqliteLogs);
      }
      
      // Convertir les changements localStorage au format des logs
      const localStorageLogs = localStorageChanges.map(change => ({
        id: `localStorage_${change.id}`,
        lawyer_nom: change.lawyer_nom,
        lawyer_prenom: change.lawyer_prenom,
        lawyer_email: change.lawyer_email,
        lawyer_cabinet: change.lawyer_cabinet,
        old_status: change.old_status,
        new_status: change.new_status,
        changed_by_name: change.changed_by,
        changed_at: change.changed_at,
        exported_at: change.exported ? change.changed_at : null
      }));
      
      console.log(` StatusLogs: ${localStorageLogs.length} changements localStorage convertis`);
      allLogs.push(...localStorageLogs);
      
      // Trier tous les logs par date (plus récent en premier)
      allLogs.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
      
      setLogs(allLogs);
      console.log(` StatusLogs: ${allLogs.length} logs totaux affichés (SQLite + localStorage)`);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalLogs: allLogs.length,
          todayLogs: allLogs.filter(log => {
            const logDate = new Date(log.changed_at);
            const today = new Date();
            return logDate.toDateString() === today.toDateString();
          }).length,
          unexportedLogs: statsData.stats?.unexportedLogs || localStorageChanges.length,
          usersCount: statsData.stats?.usersCount || 0
        });
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

  // Fonctions de gestion de la sélection multiple
  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      // Tout désélectionner
      setSelectedLogs(new Set());
    } else {
      // Tout sélectionner
      const allIds = new Set(filteredLogs.map(log => String(log.id)));
      setSelectedLogs(allIds);
    }
  };

  const toggleSelectLog = (logId: string) => {
    const newSelection = new Set(selectedLogs);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    setSelectedLogs(newSelection);
  };

  // Actions en lot
  const handleBulkDelete = async () => {
    if (selectedLogs.size === 0) return;
    
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedLogs.size} log(s) sélectionné(s) ?`;
    if (!confirm(confirmMessage)) return;

    setBulkActionLoading(true);
    try {
      // Séparer les logs localStorage des logs SQLite
      const localStorageIds: string[] = [];
      const sqliteIds: string[] = [];
      
      selectedLogs.forEach(logId => {
        if (String(logId).startsWith('localStorage_')) {
          localStorageIds.push(logId);
        } else {
          sqliteIds.push(logId);
        }
      });

      // Supprimer les logs localStorage
      if (localStorageIds.length > 0) {
        const { statusChangesStorage } = await import('@/lib/status-changes-storage');
        localStorageIds.forEach(id => {
          const cleanId = id.replace('localStorage_', '');
          statusChangesStorage.deleteChange(cleanId);
        });
        console.log(` ${localStorageIds.length} logs localStorage supprimés`);
      }

      // Supprimer les logs SQLite via API
      if (sqliteIds.length > 0) {
        const response = await fetch('/api/status-logs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: sqliteIds.map(id => parseInt(id)) })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Erreur API SQLite: ${errorData.error || 'Erreur inconnue'}`);
        }
        console.log(` ${sqliteIds.length} logs SQLite supprimés`);
      }

      // Recharger les données et réinitialiser la sélection
      await fetchData();
      setSelectedLogs(new Set());
      
    } catch (error) {
      console.error('Erreur suppression en lot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`❌ Erreur lors de la suppression:\n${errorMessage}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedLogs.size === 0) return;

    setBulkActionLoading(true);
    try {
      // Pour les logs localStorage, on les marque comme "exportés"
      const localStorageIds: string[] = [];
      const sqliteIds: string[] = [];
      
      selectedLogs.forEach(logId => {
        if (String(logId).startsWith('localStorage_')) {
          localStorageIds.push(logId);
        } else {
          sqliteIds.push(logId);
        }
      });

      // Marquer les logs localStorage comme exportés
      if (localStorageIds.length > 0) {
        const { statusChangesStorage } = await import('@/lib/status-changes-storage');
        localStorageIds.forEach(id => {
          const cleanId = id.replace('localStorage_', '');
          statusChangesStorage.markAsExported([cleanId]);
        });
        console.log(` ${localStorageIds.length} logs localStorage marqués comme lus`);
      }

      // Marquer les logs SQLite comme exportés via API
      if (sqliteIds.length > 0) {
        const response = await fetch('/api/status-logs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ids: sqliteIds.map(id => parseInt(id)),
            action: 'mark_as_exported'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Erreur API SQLite: ${errorData.error || 'Erreur inconnue'}`);
        }
        console.log(` ${sqliteIds.length} logs SQLite marqués comme lus`);
      }

      // Recharger les données et réinitialiser la sélection
      await fetchData();
      setSelectedLogs(new Set());
      
    } catch (error) {
      console.error('Erreur marquage en lot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`❌ Erreur lors du marquage:\n${errorMessage}`);
    } finally {
      setBulkActionLoading(false);
    }
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

        {/* Barre d'actions en lot */}
        {selectedLogs.size > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedLogs.size} élément{selectedLogs.size > 1 ? 's' : ''} sélectionné{selectedLogs.size > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkMarkAsRead}
                disabled={bulkActionLoading}
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Eye className="w-4 h-4 mr-1" />
                )}
                Marquer comme lu
              </Button>
              
              <Button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Supprimer
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length}
                    onCheckedChange={toggleSelectAll}
                    className="mx-auto"
                  />
                </TableHead>
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
                  <TableCell className="w-12">
                    <Checkbox
                      checked={selectedLogs.has(String(log.id))}
                      onCheckedChange={() => toggleSelectLog(String(log.id))}
                      className="mx-auto"
                    />
                  </TableCell>
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
                  <TableCell className="space-y-1">
                    {/* Badge d'export */}
                    {log.exported_at ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        ✅ Exporté
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                        ⏳ En attente
                      </Badge>
                    )}
                    
                    {/* Badge source */}
                    {log.id && String(log.id).startsWith('localStorage_') && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        📱 localStorage
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