import { NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Testing statut cabinet column AH...');

    // Utiliser le service existant pour récupérer les headers
    const headerData = await googleSheetsService.getSheetHeaders();

    // Test pour récupérer les colonnes A (nom_complet), AH (statut_cabinet) et AI (cabinet) des 20 premières lignes
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Base principale!A1:AI21', // A jusqu'à AI pour inclure AH (index 33)
    });

    const rows = response.data.values || [];
    
    if (rows.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Pas assez de données dans le sheet',
      });
    }

    // Identifier les colonnes
    const headers = rows[0];
    const colAIndex = 0; // nom_complet 
    const colAHIndex = 33; // statut_cabinet (AH = 33)
    const colAIIndex = 34; // cabinet (AI = 34)

    console.log('En-têtes trouvés:', {
      colA: headers[colAIndex],
      colAH: headers[colAHIndex], 
      colAI: headers[colAIIndex]
    });

    const results = rows.slice(1, 21).map((row: any[], index: number) => {
      const nomComplet = row[colAIndex] || '';
      const statutCabinet = row[colAHIndex] || '';
      const cabinet = row[colAIIndex] || '';
      
      return {
        ligne: index + 2,
        nom_complet: nomComplet,
        statut_cabinet: statutCabinet,
        cabinet: cabinet,
        has_statut: statutCabinet !== ''
      };
    });

    // Statistiques
    const totalRows = results.length;
    const rowsWithStatut = results.filter(r => r.has_statut).length;
    const statutTypes = results
      .filter(r => r.has_statut)
      .map(r => r.statut_cabinet)
      .filter((value, index, self) => self.indexOf(value) === index);

    return NextResponse.json({
      success: true,
      message: 'Test récupération statut cabinet colonne AH',
      timestamp: new Date().toISOString(),
      stats: {
        total_rows_tested: totalRows,
        rows_with_statut: rowsWithStatut,
        rows_without_statut: totalRows - rowsWithStatut,
        percentage_with_statut: Math.round((rowsWithStatut / totalRows) * 100)
      },
      statut_types: statutTypes,
      sample_data: results.slice(0, 10),
      column_indexes: {
        colA: colAIndex,
        colAH: colAHIndex,
        colAI: colAIIndex
      }
    });

  } catch (error) {
    console.error('Google Sheets statut cabinet test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Google Sheets: ' + (error as Error).message,
    });
  }
}