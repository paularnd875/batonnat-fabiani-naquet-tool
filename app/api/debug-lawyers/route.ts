import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Récupérer quelques avocats pour voir leur structure
    const { data: lawyers } = await supabase
      .from('lawyers')
      .select('prenomnom, nom_complet, cabinet, civilite, telephone, email')
      .limit(10);

    // Vérifier les cabinets non-vides
    const { data: lawyersWithCabinet } = await supabase
      .from('lawyers')
      .select('prenomnom, nom_complet, cabinet')
      .not('cabinet', 'eq', '')
      .not('cabinet', 'is', null)
      .limit(10);

    return NextResponse.json({
      success: true,
      debug: {
        all_lawyers_sample: lawyers,
        lawyers_with_cabinet: lawyersWithCabinet,
      }
    });

  } catch (error) {
    console.error('Erreur debug lawyers:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}