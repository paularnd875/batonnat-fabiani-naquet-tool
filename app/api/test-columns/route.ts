import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log(' Test des colonnes dans la base de données...');

    // 1. Test lecture d'un avocat avec toutes les colonnes
    const { data: testLawyer, error: readError } = await supabase
      .from('lawyers')
      .select('prenomnom, origine, soutien_public, classement, cabinet')
      .limit(1)
      .single();

    if (readError) {
      console.error(' Erreur lecture:', readError);
      return NextResponse.json({
        success: false,
        error: `Erreur lecture: ${readError.message}`,
        step: 'read_test'
      });
    }

    console.log(' Lecture OK:', testLawyer);

    // 2. Test insertion d'un avocat de test
    const testData = {
      prenomnom: 'test_migration_' + Date.now(),
      origine: 'test',
      soutien_public: true,
      classement: 'C1',
      cabinet: 'Cabinet Test',
      civilite: 'M.',
      nom_complet: 'Test Migration',
      last_synced_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('lawyers')
      .insert([testData])
      .select();

    if (insertError) {
      console.error(' Erreur insertion:', insertError);
      return NextResponse.json({
        success: false,
        error: `Erreur insertion: ${insertError.message}`,
        step: 'insert_test'
      });
    }

    console.log(' Insertion OK:', insertResult);

    // 3. Nettoyage du test
    await supabase
      .from('lawyers')
      .delete()
      .eq('prenomnom', testData.prenomnom);

    console.log(' Nettoyage OK');

    // 4. Test table firms 
    const { data: testFirm, error: firmError } = await supabase
      .from('firms')
      .select('name, soutien_public_count')
      .limit(1)
      .single();

    if (firmError) {
      console.error(' Erreur firms:', firmError);
      return NextResponse.json({
        success: false,
        error: `Erreur table firms: ${firmError.message}`,
        step: 'firms_test'
      });
    }

    console.log(' Table firms OK:', testFirm);

    return NextResponse.json({
      success: true,
      message: 'Toutes les colonnes sont disponibles',
      tests: {
        lawyers_read: '✅',
        lawyers_insert: '✅', 
        firms_soutien_public_count: '✅'
      }
    });

  } catch (error) {
    console.error(' Erreur test:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}