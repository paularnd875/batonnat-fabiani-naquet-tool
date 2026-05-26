import Database from 'better-sqlite3';
import path from 'path';

// Interface pour les logs de changement de statut
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

class DatabaseService {
  private db: Database.Database;

  constructor() {
    // Chemin vers la base de données SQLite
    // Utiliser /tmp sur Vercel (seul répertoire writable), data/ en local
    const isVercel = process.env.VERCEL === '1';
    const dbPath = isVercel 
      ? '/tmp/logs.db' 
      : path.join(process.cwd(), 'data', 'logs.db');
    
    // Créer le répertoire data seulement en local
    if (!isVercel) {
      const fs = require('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Table des utilisateurs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Table des logs de changement de statut
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS status_change_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lawyer_id TEXT NOT NULL,
        lawyer_nom TEXT NOT NULL,
        lawyer_prenom TEXT NOT NULL,
        lawyer_prenomnom_uniforme TEXT NOT NULL,
        lawyer_email TEXT NOT NULL,
        lawyer_cabinet TEXT NOT NULL,
        old_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        changed_by_user_id INTEGER NOT NULL,
        changed_by_name TEXT NOT NULL,
        changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        exported_at TEXT NULL,
        FOREIGN KEY (changed_by_user_id) REFERENCES users (id)
      )
    `);

    console.log('✅ Tables de base de données initialisées');
    
    // Créer les utilisateurs par défaut sur Vercel si aucun utilisateur n'existe
    this.createDefaultUsersIfEmpty();
  }
  
  private createDefaultUsersIfEmpty() {
    const existingUsers = this.getAllUsers();
    
    // Si aucun utilisateur n'existe, créer les utilisateurs par défaut
    if (existingUsers.length === 0) {
      console.log('📝 Création des utilisateurs par défaut...');
      
      const defaultUsers = [
        { nom: 'Arnould', prenom: 'Paul', email: 'paul@batonnat.com' },
        { nom: 'Test', prenom: 'Utilisateur', email: 'test@example.com' },
        { nom: 'Fabiani', prenom: 'Marie-Hélène', email: 'mhfabiani@example.com' },
        { nom: 'Naquet', prenom: 'Franck', email: 'fnaquet@example.com' }
      ];
      
      for (const user of defaultUsers) {
        try {
          this.createUser(user.nom, user.prenom, user.email);
          console.log(`👤 Utilisateur par défaut créé: ${user.prenom} ${user.nom}`);
        } catch (error) {
          // Ignorer les erreurs (par exemple si l'utilisateur existe déjà)
          console.warn(`⚠️ Erreur création utilisateur par défaut ${user.prenom} ${user.nom}:`, error);
        }
      }
    } else {
      console.log(`👥 ${existingUsers.length} utilisateurs existants trouvés`);
    }
  }

  // === GESTION DES UTILISATEURS ===

  createUser(nom: string, prenom: string, email: string): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (nom, prenom, email)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(nom, prenom, email);
    return this.getUserById(result.lastInsertRowid as number)!;
  }

  getUserById(id: number): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY prenom, nom');
    return stmt.all() as User[];
  }

  // === GESTION DES LOGS DE CHANGEMENT ===

  logStatusChange(data: {
    lawyer_id: string;
    lawyer_nom: string;
    lawyer_prenom: string;
    lawyer_email: string;
    lawyer_cabinet: string;
    old_status: string;
    new_status: string;
    changed_by_user_id: number;
    changed_by_name: string;
  }): StatusChangeLog {
    // Générer prenomnom uniforme
    const prenomnom_uniforme = this.uniformizePrenomNom(data.lawyer_prenom + data.lawyer_nom);
    
    const stmt = this.db.prepare(`
      INSERT INTO status_change_logs (
        lawyer_id, lawyer_nom, lawyer_prenom, lawyer_prenomnom_uniforme, 
        lawyer_email, lawyer_cabinet, old_status, new_status, 
        changed_by_user_id, changed_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.lawyer_id,
      data.lawyer_nom,
      data.lawyer_prenom,
      prenomnom_uniforme,
      data.lawyer_email,
      data.lawyer_cabinet,
      data.old_status,
      data.new_status,
      data.changed_by_user_id,
      data.changed_by_name
    );

    return this.getStatusChangeLogById(result.lastInsertRowid as number)!;
  }

  getStatusChangeLogById(id: number): StatusChangeLog | null {
    const stmt = this.db.prepare('SELECT * FROM status_change_logs WHERE id = ?');
    return stmt.get(id) as StatusChangeLog | null;
  }

  getAllStatusChangeLogs(filters?: {
    exported?: boolean;
    user_id?: number;
    since?: string; // ISO date
  }): StatusChangeLog[] {
    let query = 'SELECT * FROM status_change_logs WHERE 1=1';
    const params: any[] = [];

    if (filters?.exported === true) {
      query += ' AND exported_at IS NOT NULL';
    } else if (filters?.exported === false) {
      query += ' AND exported_at IS NULL';
    }

    if (filters?.user_id) {
      query += ' AND changed_by_user_id = ?';
      params.push(filters.user_id);
    }

    if (filters?.since) {
      query += ' AND changed_at >= ?';
      params.push(filters.since);
    }

    query += ' ORDER BY changed_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as StatusChangeLog[];
  }

  // Alias pour l'API
  getStatusChangeLogs(): StatusChangeLog[] {
    return this.getAllStatusChangeLogs();
  }

  getUnexportedStatusChangesCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM status_change_logs WHERE exported_at IS NULL');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  markStatusChangesAsExported(ids: number[]): void {
    if (ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE status_change_logs 
      SET exported_at = datetime('now') 
      WHERE id IN (${placeholders})
    `);
    
    stmt.run(...ids);
  }

  // Récupérer le dernier statut d'un avocat spécifique
  getLatestStatusForLawyer(lawyerId: string): string | null {
    const stmt = this.db.prepare(`
      SELECT new_status 
      FROM status_change_logs 
      WHERE lawyer_id = ? 
      ORDER BY changed_at DESC 
      LIMIT 1
    `);
    
    const result = stmt.get(lawyerId) as { new_status: string } | undefined;
    return result?.new_status || null;
  }

  // Récupérer tous les derniers statuts des avocats modifiés
  getAllLatestStatuses(): Map<string, string> {
    const stmt = this.db.prepare(`
      SELECT DISTINCT lawyer_id, 
             FIRST_VALUE(new_status) OVER (
               PARTITION BY lawyer_id 
               ORDER BY changed_at DESC
             ) as latest_status
      FROM status_change_logs
      ORDER BY lawyer_id
    `);
    
    const results = stmt.all() as Array<{ lawyer_id: string; latest_status: string }>;
    const statusMap = new Map<string, string>();
    
    for (const result of results) {
      statusMap.set(result.lawyer_id, result.latest_status);
    }
    
    return statusMap;
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

  // Méthode pour fermer la base de données (utile pour les tests)
  close() {
    this.db.close();
  }
}

// Import du service Supabase pour Vercel
import { getSupabaseDatabase } from './database-supabase';

// Singleton pour la base de données
let databaseInstance: DatabaseService | null = null;

export function getDatabase(): DatabaseService | any {
  // Utiliser Supabase sur Vercel, SQLite en local
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    console.log('🔄 Utilisation de Supabase pour la persistance sur Vercel');
    return getSupabaseDatabase();
  }
  
  if (!databaseInstance) {
    console.log('🔄 Utilisation de SQLite en local');
    databaseInstance = new DatabaseService();
  }
  return databaseInstance;
}

export { DatabaseService };