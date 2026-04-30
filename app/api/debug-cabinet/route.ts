import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Test 1: Compter les avocats du cabinet "Individuel"
    const { data: individuels, count: countIndividuels } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: false })
      .eq('cabinet', 'Individuel')
      .limit(5);

    // Test 2: Voir quelques exemples de noms de cabinets
    const { data: uniqueCabinets } = await supabase
      .from('lawyers')
      .select('cabinet')
      .limit(10);

    // Test 3: Chercher les avocats sans jointure
    const { data: simpleQuery } = await supabase
      .from('lawyers')
      .select('prenomnom, nom_complet, cabinet')
      .eq('cabinet', 'Individuel')
      .limit(3);

    return NextResponse.json({
      success: true,
      debug: {
        individuels_count: countIndividuels,
        individuels_sample: individuels,
        unique_cabinets_sample: uniqueCabinets,
        simple_query_sample: simpleQuery,
      }
    });

  } catch (error) {
    console.error('Erreur debug:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}