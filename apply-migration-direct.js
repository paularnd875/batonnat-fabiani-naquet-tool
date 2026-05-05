import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oljogamhjdhlcrqkowpf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam9nYW1oamRobGNycWtvd3BmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ2NTQ4NSwiZXhwIjoyMDkzMDQxNDg1fQ.Jz3C7RAG6KCPqjCKdQKIrAVuVzg1bps2lGyT02HNVLk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🔧 Application des migrations...');

  const migrations = [
    'ALTER TABLE "lawyers" ADD COLUMN "origine" text;',
    'ALTER TABLE "lawyers" ADD COLUMN "soutien_public" boolean DEFAULT false;',
    'ALTER TABLE "team_members" ADD COLUMN "sheet_origin" text;',
    'CREATE INDEX "lawyers_origine_idx" ON "lawyers" ("origine");'
  ];

  for (const migration of migrations) {
    console.log(`\n🔄 Exécution: ${migration}`);
    
    const { error } = await supabase.rpc('query', { 
      query: migration 
    });

    if (error) {
      console.error('❌ Erreur:', error);
    } else {
      console.log('✅ OK');
    }
  }

  // Vérification
  console.log('\n🔍 Vérification des colonnes...');
  const { data: testData, error: testError } = await supabase
    .from('lawyers')
    .select('origine, soutien_public')
    .limit(1);

  if (testError) {
    console.error('❌ Les colonnes n\'existent toujours pas:', testError.message);
  } else {
    console.log('✅ Les colonnes origine et soutien_public existent !');
  }
}

applyMigrations();