import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST() {
  try {
    console.log(' Application migration pour colonnes manquantes...');
    
    const supabase = getSupabaseClient();
    
    // Vérifier si les colonnes existent déjà
    console.log(' Vérification des colonnes existantes...');
    
    // Test si on peut lire les nouvelles colonnes
    const { data: testLawyer, error: testError } = await supabase
      .from('lawyers')
      .select('origine, soutien_public')
      .limit(1);
    
    if (testError && testError.message.includes('origine')) {
      return NextResponse.json({
        success: false,
        error: 'Les colonnes origine et soutien_public n\'existent pas dans la table lawyers. Vous devez les ajouter manuellement via l\'interface Supabase.',
        details: {
          message: 'Connectez-vous à votre dashboard Supabase et exécutez ces commandes SQL:',
          sql: [
            'ALTER TABLE "lawyers" ADD COLUMN "origine" text;',
            'ALTER TABLE "lawyers" ADD COLUMN "soutien_public" boolean DEFAULT false;',
            'ALTER TABLE "team_members" ADD COLUMN "sheet_origin" text;',
            'CREATE INDEX "lawyers_origine_idx" ON "lawyers" ("origine");'
          ],
          dashboard_url: `${process.env.SUPABASE_URL}/dashboard/project`
        }
      });
    }
    
    const results = ['✅ Les colonnes origine et soutien_public existent déjà'];
    
    console.log(' Migration terminée');
    
    return NextResponse.json({
      success: true,
      message: 'Migration appliquée',
      results
    });

  } catch (error) {
    console.error(' Erreur migration:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}