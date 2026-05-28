'use client';

// Service de gestion des changements de statut en localStorage
export interface StatusChange {
  id: string;
  lawyer_id: string;
  lawyer_nom: string;
  lawyer_prenom: string;
  lawyer_email: string;
  lawyer_cabinet: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  exported: boolean;
}

class StatusChangesStorage {
  private readonly STORAGE_KEY = 'fn-status-changes';
  private readonly CURRENT_STATUSES_KEY = 'fn-current-statuses';

  // Sauvegarder un changement de statut
  saveStatusChange(change: Omit<StatusChange, 'id' | 'changed_at' | 'exported'>): StatusChange {
    const newChange: StatusChange = {
      ...change,
      id: Date.now().toString(),
      changed_at: new Date().toISOString(),
      exported: false
    };

    const changes = this.getAllChanges();
    changes.push(newChange);
    this.saveChangesToStorage(changes);

    // Mettre à jour le statut actuel
    this.updateCurrentStatus(change.lawyer_id, change.new_status);

    console.log(`✅ Changement sauvegardé: ${change.lawyer_prenom} ${change.lawyer_nom} (${change.old_status} → ${change.new_status})`);
    
    return newChange;
  }

  // Récupérer tous les changements
  getAllChanges(): StatusChange[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
      return [];
    }
  }

  // Récupérer les changements non exportés
  getUnexportedChanges(): StatusChange[] {
    return this.getAllChanges().filter(change => !change.exported);
  }

  // Marquer des changements comme exportés
  markAsExported(ids: string[]): void {
    const changes = this.getAllChanges();
    const updatedChanges = changes.map(change => 
      ids.includes(change.id) ? { ...change, exported: true } : change
    );
    this.saveChangesToStorage(updatedChanges);
    
    console.log(`📤 ${ids.length} changements marqués comme exportés`);
  }

  // Supprimer un changement par ID
  deleteChange(id: string): void {
    const changes = this.getAllChanges();
    const updatedChanges = changes.filter(change => change.id !== id);
    this.saveChangesToStorage(updatedChanges);
    
    console.log(`🗑️ Changement ${id} supprimé`);
  }

  // Supprimer plusieurs changements par leurs IDs
  deleteChanges(ids: string[]): void {
    const changes = this.getAllChanges();
    const updatedChanges = changes.filter(change => !ids.includes(change.id));
    this.saveChangesToStorage(updatedChanges);
    
    console.log(`🗑️ ${ids.length} changements supprimés`);
  }

  // Mettre à jour le statut actuel d'un avocat
  private updateCurrentStatus(lawyerId: string, newStatus: string): void {
    try {
      const statuses = this.getCurrentStatuses();
      statuses[lawyerId] = newStatus;
      localStorage.setItem(this.CURRENT_STATUSES_KEY, JSON.stringify(statuses));
    } catch (error) {
      console.error('Erreur mise à jour statut actuel:', error);
    }
  }

  // Récupérer tous les statuts actuels
  getCurrentStatuses(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.CURRENT_STATUSES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Erreur lecture statuts actuels:', error);
      return {};
    }
  }

  // Récupérer le statut actuel d'un avocat
  getCurrentStatus(lawyerId: string): string | null {
    const statuses = this.getCurrentStatuses();
    return statuses[lawyerId] || null;
  }

  // Sauvegarder les changements dans le localStorage
  private saveChangesToStorage(changes: StatusChange[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(changes));
    } catch (error) {
      console.error('Erreur sauvegarde localStorage:', error);
    }
  }

  // Générer CSV des changements non exportés
  generateCSV(): string {
    const unexportedChanges = this.getUnexportedChanges();
    
    if (unexportedChanges.length === 0) {
      return '';
    }

    const headers = [
      'Date/Heure',
      'Prénom',
      'Nom', 
      'Email',
      'Cabinet',
      'Ancien Statut',
      'Nouveau Statut',
      'Modifié par'
    ];

    const rows = unexportedChanges.map(change => [
      new Date(change.changed_at).toLocaleString('fr-FR'),
      change.lawyer_prenom,
      change.lawyer_nom,
      change.lawyer_email,
      change.lawyer_cabinet,
      change.old_status,
      change.new_status,
      change.changed_by
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Télécharger le CSV
  downloadCSV(): void {
    const csvContent = this.generateCSV();
    
    if (!csvContent) {
      alert('Aucun changement non exporté à télécharger');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const now = new Date();
    const filename = `changements_statuts_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // Marquer tous les changements comme exportés
    const unexportedIds = this.getUnexportedChanges().map(c => c.id);
    this.markAsExported(unexportedIds);

    console.log(`📥 CSV téléchargé: ${filename}`);
  }

  // Nettoyer le stockage (pour debug)
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_STATUSES_KEY);
    console.log('🗑️ Stockage nettoyé');
  }
}

// Instance singleton
export const statusChangesStorage = new StatusChangesStorage();