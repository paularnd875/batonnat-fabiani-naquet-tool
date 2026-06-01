import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Test direct Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log(' Debug team - URL exists:', !!supabaseUrl);
    console.log(' Debug team - Key exists:', !!supabaseKey);
    
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
    
    // Vérifier team_members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .order('prenom', { ascending: true });

    // Vérifier s'il y a une table users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });

    console.log(' Debug - Team members:', teamMembers?.length, 'trouvés');
    console.log(' Debug - Users:', users?.length, 'trouvés, erreur:', usersError?.message);

    return NextResponse.json({
      success: true,
      team_members: teamMembers || [],
      users: users || [],
      debug: {
        team_count: teamMembers?.length || 0,
        users_count: users?.length || 0,
        team_error: teamError?.message || null,
        users_error: usersError?.message || null,
        source: 'Direct Supabase connection - Both tables'
      }
    });

  } catch (error) {
    console.error(' Debug team - Erreur générale:', error);
    
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