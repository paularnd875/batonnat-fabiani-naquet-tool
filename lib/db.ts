import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Client Supabase pour les opérations administratives
// Initialisation défensive pour éviter les erreurs pendant le build
let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // Vérification défensive pour éviter les erreurs pendant le build
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      // Pendant le build, retourner un client mock qui ne fera pas d'erreur
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_PHASE) {
        return {
          from: () => ({
            select: () => ({
              then: () => ({ data: [], error: null })
            })
          })
        };
      }
      throw new Error(`Supabase credentials not configured: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    return getSupabaseClient()[prop];
  }
});

// Client Drizzle pour les opérations de base de données
// Initialisation défensive pour éviter les erreurs pendant le build
let drizzleClient: any = null;

function getDrizzleClient() {
  if (!drizzleClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (!supabaseUrl) {
      // Pendant le build, retourner un client mock qui ne fera pas d'erreur
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_PHASE) {
        return {
          select: () => ({
            from: () => ({
              where: () => ({
                then: () => []
              })
            })
          })
        };
      }
      throw new Error('Supabase URL not configured for Drizzle');
    }
    
    // Construction de l'URL de connexion Postgres avec la clé service
    const connectionString = `postgresql://postgres:[service-role-key]@db.${supabaseUrl.split('//')[1]?.split('.')[0]}.supabase.co:5432/postgres?sslmode=require`;
    const client = postgres(connectionString, { prepare: false });
    drizzleClient = drizzle(client, { schema });
  }
  return drizzleClient;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    return getDrizzleClient()[prop];
  }
});