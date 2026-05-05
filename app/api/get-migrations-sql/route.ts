import { NextResponse } from 'next/server';

export async function GET() {
  const sqlCommands = `
-- ================================================================
-- MIGRATIONS SQL NECESSAIRES - EXECUTER DANS SUPABASE SQL EDITOR
-- ================================================================
-- Date: 2026-05-04
-- Description: Ajout colonnes manquantes origine et soutien_public

-- 1. Ajouter la colonne 'origine' à la table lawyers (si pas déjà fait)
ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS origine text;

-- 2. Ajouter la colonne 'soutien_public' à la table lawyers (si pas déjà fait)  
ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS soutien_public boolean DEFAULT false;

-- 3. Ajouter la colonne 'soutien_public_count' à la table firms
ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS soutien_public_count integer DEFAULT 0;

-- 4. Ajouter les commentaires pour documenter les colonnes
COMMENT ON COLUMN lawyers.origine IS 'Origine/Prénom responsable (colonne AW du Google Sheet)';
COMMENT ON COLUMN lawyers.soutien_public IS 'Soutien public - Booléen (colonne AY du Google Sheet)';
COMMENT ON COLUMN firms.soutien_public_count IS 'Nombre d''avocats ayant un soutien public dans ce cabinet';

-- 5. Optionnel: Créer des index pour améliorer les performances 
CREATE INDEX IF NOT EXISTS idx_lawyers_origine ON lawyers(origine);
CREATE INDEX IF NOT EXISTS idx_lawyers_soutien_public ON lawyers(soutien_public);

-- ================================================================
-- FIN DES MIGRATIONS
-- ================================================================
  `;

  return NextResponse.json({
    success: true,
    message: 'Migrations SQL ready to execute',
    sql: sqlCommands,
    instructions: [
      '1. Copier-coller ce SQL dans Supabase SQL Editor:',
      '   https://oljogamhjdhlcrqkowpf.supabase.co/project/oljogamhjdhlcrqkowpf/sql/new',
      '2. Cliquer "Run" pour exécuter les migrations',
      '3. Une fois terminé, relancer la synchronisation avec: POST /api/sync',
      '4. Puis recalculer les stats avec: POST /api/fix-stats'
    ],
    next_steps: [
      'curl -X POST http://localhost:3000/api/sync',
      'curl -X POST http://localhost:3000/api/fix-stats'
    ]
  });
}