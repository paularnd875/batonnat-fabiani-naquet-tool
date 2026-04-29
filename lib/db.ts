import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Pour Supabase, on utilise directement les clés d'API
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase credentials not configured');
}

// Client Supabase pour les opérations administratives
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client Drizzle pour les opérations de base de données
// Construction de l'URL de connexion Postgres avec la clé service
const connectionString = `postgresql://postgres:[service-role-key]@db.${process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0]}.supabase.co:5432/postgres?sslmode=require`;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });