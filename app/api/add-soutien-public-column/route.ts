import { NextResponse } from 'next/server';

export async function GET() {
  const sqlCommand = `
-- Migration: Ajouter colonne soutien_public_count à la table firms
-- Date: 2026-05-04

-- Ajouter la colonne soutien_public_count avec valeur par défaut 0
ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS soutien_public_count integer DEFAULT 0;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN firms.soutien_public_count IS 'Nombre d''avocats ayant un soutien public dans ce cabinet';
  `;

  return NextResponse.json({
    success: true,
    message: 'SQL command ready to execute',
    sql: sqlCommand,
    instructions: 'Copy and paste this SQL in Supabase SQL Editor at https://oljogamhjdhlcrqkowpf.supabase.co/project/oljogamhjdhlcrqkowpf/sql/new'
  });
}