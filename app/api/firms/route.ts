import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('📋 Récupération de tous les cabinets par pagination...');
    
    let allFirms: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('lawyer_count', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allFirms.push(...data);
        page++;
        console.log(`📄 Page ${page}: +${data.length} cabinets (total: ${allFirms.length})`);
        
        // Si cette page a moins de 1000 enregistrements, on a atteint la fin
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ ${allFirms.length} cabinets récupérés au total`);

    return NextResponse.json({
      success: true,
      firms: allFirms,
      count: allFirms.length,
    });

  } catch (error) {
    console.error('Erreur récupération cabinets:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}