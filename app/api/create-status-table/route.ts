import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST() {
  try {
    console.log(' Création de la table status_change_logs_sqlite...');
    
    // SQL pour créer la table de logs de changement de statut
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS status_change_logs_sqlite (
        id SERIAL PRIMARY KEY,
        lawyer_id TEXT NOT NULL,
        lawyer_nom TEXT NOT NULL,
        lawyer_prenom TEXT NOT NULL,
        lawyer_prenomnom_uniforme TEXT NOT NULL,
        lawyer_email TEXT NOT NULL,
        lawyer_cabinet TEXT NOT NULL,
        old_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        changed_by_user_id INTEGER NOT NULL,
        changed_by_name TEXT NOT NULL,
        changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        exported_at TIMESTAMP WITH TIME ZONE NULL
      );

      -- Index pour recherche par lawyer_id
      CREATE INDEX IF NOT EXISTS idx_status_logs_lawyer_id ON status_change_logs_sqlite(lawyer_id);
      
      -- Index pour recherche par date
      CREATE INDEX IF NOT EXISTS idx_status_logs_changed_at ON status_change_logs_sqlite(changed_at DESC);
      
      -- Index pour recherche des non-exportés
      CREATE INDEX IF NOT EXISTS idx_status_logs_not_exported ON status_change_logs_sqlite(exported_at) WHERE exported_at IS NULL;
    `;

    // Exécuter la requête SQL via l'API Supabase
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.error(' Erreur création table:', error);
      
      // Essayer une approche alternative si la fonction RPC n'existe pas
      console.log(' Tentative création table alternative...');
      
      // Créer d'abord un enregistrement fictif pour forcer la création de la table
      const { error: insertError } = await supabase
        .from('status_change_logs_sqlite')
        .upsert({
          id: -1,
          lawyer_id: 'test',
          lawyer_nom: 'TEST',
          lawyer_prenom: 'TEST',
          lawyer_prenomnom_uniforme: 'testtest',
          lawyer_email: 'test@test.com',
          lawyer_cabinet: 'Test Cabinet',
          old_status: '',
          new_status: 'TEST',
          changed_by_user_id: 1,
          changed_by_name: 'Test User',
          changed_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        return NextResponse.json({
          success: false,
          error: 'Table creation failed',
          details: error,
          insertError
        }, { status: 500 });
      } else {
        // Supprimer l'enregistrement de test
        await supabase
          .from('status_change_logs_sqlite')
          .delete()
          .eq('id', -1);
          
        return NextResponse.json({
          success: true,
          message: 'Table créée avec succès (méthode alternative)',
          method: 'insert-test'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Table status_change_logs_sqlite créée avec succès',
      data
    });

  } catch (error) {
    console.error(' Erreur création table:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}