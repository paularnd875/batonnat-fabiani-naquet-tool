import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('🔍 Test direct des credentials Supabase...');
    
    // Vérifier si les variables existent
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'Credentials manquants',
        details: {
          hasUrl: !!url,
          hasServiceKey: !!serviceKey,
          urlPrefix: url ? url.substring(0, 20) + '...' : 'absent',
          keyPrefix: serviceKey ? serviceKey.substring(0, 15) + '...' : 'absent'
        }
      });
    }
    
    // Créer le client Supabase directement
    const supabase = createClient(url, serviceKey);
    
    // Test simple : compter les avocats
    const { data, error, count } = await supabase
      .from('lawyers')
      .select('prenomnom', { count: 'exact', head: true });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Erreur requête Supabase',
        details: error
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase fonctionne !',
      lawyers_count: count || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur test Supabase:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    }, { status: 500 });
  }
}