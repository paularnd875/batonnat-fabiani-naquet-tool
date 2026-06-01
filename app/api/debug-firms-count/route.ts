import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log(' Comptage précis des cabinets...');
    
    // Compter le nombre total de cabinets
    const { count, error } = await supabase
      .from('firms')
      .select('name', { count: 'exact', head: true });

    if (error) {
      console.error('Erreur comptage:', error);
      throw error;
    }

    console.log(` Nombre total de cabinets en base: ${count}`);

    return NextResponse.json({
      success: true,
      total_firms_in_db: count,
      message: `Il y a ${count} cabinets dans la base de données`
    });

  } catch (error) {
    console.error(' Erreur debug count:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}