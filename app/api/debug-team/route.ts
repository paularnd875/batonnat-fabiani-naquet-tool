import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Test direct Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔧 Debug team - URL exists:', !!supabaseUrl);
    console.log('🔧 Debug team - Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Variables environnement manquantes',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    // Connexion directe sans proxy
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('prenom', { ascending: true });

    if (error) {
      console.error('🔧 Debug team - Erreur Supabase:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        debug: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      });
    }

    console.log('🔧 Debug team - Succès:', data?.length, 'membres trouvés');

    return NextResponse.json({
      success: true,
      team_members: data || [],
      debug: {
        count: data?.length || 0,
        source: 'Direct Supabase connection'
      }
    });

  } catch (error) {
    console.error('🔧 Debug team - Erreur générale:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      debug: {
        type: 'catch_error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}