import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseAnon: !!process.env.SUPABASE_ANON_KEY,
      hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasGoogleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      
      // Afficher les premières caractères (sécurisé)
      supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...',
      googleSheetIdPrefix: process.env.GOOGLE_SHEET_ID?.substring(0, 15) + '...',
      
      // Variables disponibles
      availableEnvVars: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || key.includes('GOOGLE')
      ).sort(),
    };

    return NextResponse.json({
      success: true,
      environment: 'production',
      checks: envCheck
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}