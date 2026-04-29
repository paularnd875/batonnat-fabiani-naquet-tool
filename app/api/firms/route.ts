import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .order('lawyer_count', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      firms: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Erreur récupération cabinets:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}