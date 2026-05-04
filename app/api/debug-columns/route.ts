import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    // Lire les premières lignes pour analyser les colonnes
    const response = await googleSheets.testConnection();
    
    if (response.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée trouvée' });
    }
    
    const headers = response[0] || [];
    const sampleRows = response.slice(1, 6); // 5 exemples
    
    // Analyser les colonnes autour de AV, AW, AY
    const columnAnalysis = {};
    const startIndex = 44; // Colonne AS
    const endIndex = 55;   // Colonne BC
    
    for (let i = startIndex; i <= endIndex; i++) {
      const columnLetter = String.fromCharCode(65 + Math.floor(i / 26) - 1, 65 + (i % 26));
      const values = sampleRows.map(row => row[i] || '').filter(v => v !== '');
      const uniqueValues = [...new Set(values)];
      
      columnAnalysis[`${columnLetter} (index ${i})`] = {
        header: headers[i] || 'Pas d\'entête',
        sample_values: uniqueValues.slice(0, 10),
        non_empty_count: values.length
      };
    }
    
    return NextResponse.json({
      success: true,
      total_rows: response.length - 1,
      columns_analysis: columnAnalysis
    });

  } catch (error) {
    console.error('❌ Erreur debug colonnes:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}