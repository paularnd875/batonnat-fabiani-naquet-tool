import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('📊 Listage des tables Supabase...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Requête pour lister toutes les tables dans le schéma public
    const { data: tables, error: tablesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT table_name, table_schema
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
      });

    if (tablesError) {
      console.error('Erreur listage tables:', tablesError);
      
      // Essayons une approche alternative en testant les tables une par une
      const testTables = ['avocats', 'cabinets', 'assignations', 'team_members', 'lawyers', 'firms', 'status_change_logs_sqlite'];
      const existingTables = [];
      
      for (const tableName of testTables) {
        try {
          const { error } = await supabase
            .from(tableName)
            .select('count(*)', { count: 'exact', head: true })
            .limit(1);
            
          if (!error) {
            existingTables.push(tableName);
          }
        } catch (e) {
          // Table n'existe pas
        }
      }

      return NextResponse.json({
        success: true,
        method: 'fallback',
        tables: existingTables,
        message: 'Tables détectées par test d\'accès',
        rpcError: tablesError.message
      });
    }

    return NextResponse.json({
      success: true,
      method: 'information_schema',
      tables: tables || [],
      message: `${tables?.length || 0} tables trouvées`
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}