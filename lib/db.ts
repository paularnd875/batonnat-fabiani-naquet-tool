import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Client Supabase pour les opérations administratives
// Initialisation défensive pour éviter les erreurs pendant le build
let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
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
    if (!process.env.SUPABASE_URL) {
      throw new Error('Supabase URL not configured for Drizzle');
    }
    // Construction de l'URL de connexion Postgres avec la clé service
    const connectionString = `postgresql://postgres:[service-role-key]@db.${process.env.SUPABASE_URL.split('//')[1]?.split('.')[0]}.supabase.co:5432/postgres?sslmode=require`;
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