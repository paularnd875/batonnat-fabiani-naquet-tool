import { supabase } from '@/lib/db';

// Interface pour les logs de changement de statut dans Supabase
export interface StatusChangeLog {
  id: number;
  lawyer_id: string; // prenomnom pour identifier l'avocat
  lawyer_nom: string;
  lawyer_prenom: string;
  lawyer_prenomnom_uniforme: string;
  lawyer_email: string;
  lawyer_cabinet: string;
  old_status: string;
  new_status: string;
  changed_by_user_id: number;
  changed_by_name: string;
  changed_at: string; // ISO date string
  exported_at?: string; // ISO date string, null si pas encore exporté
}

// Interface pour les utilisateurs/membres d'équipe
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  created_at: string; // ISO date string
}

class DatabaseSupabaseService {
  constructor() {
    this.initTables();
  }

  private async initTables() {
    try {
      // Vérifier si les tables existent, les créer si nécessaire
      const { error } = await supabase
        .from('status_change_logs_sqlite')
        .select('count(*)')
        .limit(1);
        
      if (error && error.code === 'PGRST116') {
        console.log('📋 Création de la table status_change_logs_sqlite...');
        // La table n'existe pas, on devra la créer via migration
        console.log('⚠️ Table status_change_logs_sqlite nécessite une migration SQL');
      }
      
      console.log('✅ Service de base de données Supabase initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation base Supabase:', error);
    }
  }

  // === GESTION DES LOGS DE CHANGEMENT ===

  async logStatusChange(data: {
    lawyer_id: string;
    lawyer_nom: string;
    lawyer_prenom: string;
    lawyer_email: string;
    lawyer_cabinet: string;
    old_status: string;
    new_status: string;
    changed_by_user_id: number;
    changed_by_name: string;
  }): Promise<StatusChangeLog> {
    // Générer prenomnom uniforme
    const prenomnom_uniforme = this.uniformizePrenomNom(data.lawyer_prenom + data.lawyer_nom);
    
    const { data: result, error } = await supabase
      .from('status_change_logs_sqlite')
      .insert({
        lawyer_id: data.lawyer_id,
        lawyer_nom: data.lawyer_nom,
        lawyer_prenom: data.lawyer_prenom,
        lawyer_prenomnom_uniforme: prenomnom_uniforme,
        lawyer_email: data.lawyer_email,
        lawyer_cabinet: data.lawyer_cabinet,
        old_status: data.old_status,
        new_status: data.new_status,
        changed_by_user_id: data.changed_by_user_id,
        changed_by_name: data.changed_by_name,
        changed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur insertion log status:', error);
      throw error;
    }

    return result as StatusChangeLog;
  }

  async getAllStatusChangeLogs(filters?: {
    exported?: boolean;
    user_id?: number;
    since?: string; // ISO date
  }): Promise<StatusChangeLog[]> {
    let query = supabase.from('status_change_logs_sqlite').select('*');

    if (filters?.exported === true) {
      query = query.not('exported_at', 'is', null);
    } else if (filters?.exported === false) {
      query = query.is('exported_at', null);
    }

    if (filters?.user_id) {
      query = query.eq('changed_by_user_id', filters.user_id);
    }

    if (filters?.since) {
      query = query.gte('changed_at', filters.since);
    }

    query = query.order('changed_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erreur récupération logs:', error);
      return [];
    }

    return (data || []) as StatusChangeLog[];
  }

  // Alias pour l'API
  async getStatusChangeLogs(): Promise<StatusChangeLog[]> {
    return this.getAllStatusChangeLogs();
  }

  async getUnexportedStatusChangesCount(): Promise<number> {
    const { count, error } = await supabase
      .from('status_change_logs_sqlite')
      .select('*', { count: 'exact', head: true })
      .is('exported_at', null);

    if (error) {
      console.error('❌ Erreur comptage non exportés:', error);
      return 0;
    }

    return count || 0;
  }

  async markStatusChangesAsExported(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    
    const { error } = await supabase
      .from('status_change_logs_sqlite')
      .update({ exported_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      console.error('❌ Erreur marquage exportés:', error);
      throw error;
    }
  }

  // Récupérer le dernier statut d'un avocat spécifique
  async getLatestStatusForLawyer(lawyerId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('status_change_logs_sqlite')
      .select('new_status')
      .eq('lawyer_id', lawyerId)
      .order('changed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Erreur récupération dernier statut:', error);
      return null;
    }

    return data?.[0]?.new_status || null;
  }

  // Récupérer tous les derniers statuts des avocats modifiés
  async getAllLatestStatuses(): Promise<Map<string, string>> {
    const { data, error } = await supabase
      .from('status_change_logs_sqlite')
      .select('lawyer_id, new_status, changed_at')
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération tous statuts:', error);
      return new Map();
    }

    const statusMap = new Map<string, string>();
    
    // Garder seulement le plus récent pour chaque lawyer_id
    for (const record of data || []) {
      if (!statusMap.has(record.lawyer_id)) {
        statusMap.set(record.lawyer_id, record.new_status);
      }
    }
    
    return statusMap;
  }

  // === GESTION DES UTILISATEURS ===

  async createUser(nom: string, prenom: string, email: string): Promise<User> {
    // Pour la compatibilité, on peut créer des utilisateurs basiques
    // ou utiliser une table Supabase existante si vous en avez une
    throw new Error('Création utilisateur non implémentée pour Supabase dans cette version');
  }

  async getUserById(id: number): Promise<User | null> {
    // Implementation basique - à adapter selon votre schéma Supabase
    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // Implementation basique - à adapter selon votre schéma Supabase  
    return null;
  }

  async getAllUsers(): Promise<User[]> {
    // Implementation basique - retourner utilisateurs par défaut
    return [
      { id: 1, nom: 'Arnould', prenom: 'Paul', email: 'paul@batonnat.com', created_at: new Date().toISOString() },
      { id: 2, nom: 'Test', prenom: 'Utilisateur', email: 'test@example.com', created_at: new Date().toISOString() },
    ];
  }

  // === UTILITAIRES ===

  private uniformizePrenomNom(input: string): string {
    // Implémentation de la fonction d'uniformisation demandée
    const noPunctuation = input.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"'']/g, "");
    const noSpaces = noPunctuation.replace(/\s/g, '');
    const noAccents = noSpaces.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const replaceC = noAccents.replace(/Ã§/g, "c");
    const noNumbers = replaceC.replace(/[0-9]/g, "");
    const noEmojis = noNumbers.replace(/[\p{Emoji}]/gu, "")
      .replace(/[😀-🙏🌀-🗿🚀-🛿🜀-🝿🞀-🟿🠀-🣿🤀-🧿🨀-🩯🩰-🫿☀-⛿✀-➿🇦-🇿‍️]/gu, "")
      .replace(/\u200D|\uFE0F/g, ""); // Supprime ZWJ et variantes emoji

    return noEmojis.toLowerCase();
  }
}

// Singleton pour la base de données Supabase
let databaseSupabaseInstance: DatabaseSupabaseService | null = null;

export function getSupabaseDatabase(): DatabaseSupabaseService {
  if (!databaseSupabaseInstance) {
    databaseSupabaseInstance = new DatabaseSupabaseService();
  }
  return databaseSupabaseInstance;
}

export { DatabaseSupabaseService };