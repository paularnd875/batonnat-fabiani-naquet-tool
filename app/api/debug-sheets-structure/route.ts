import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    console.log('🔍 Exploration structure Google Sheets...');
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('Google Sheets credentials not configured');
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Essayer différentes plages pour comprendre la structure
    const ranges = [
      'Synthèse vote par structure!A:G',  // Plage actuelle
      'Synthèse vote par structure!A1:G10',  // Premières lignes/colonnes
      'Synthèse vote par structure!A1:Z10',  // Plus large
    ];
    
    const results = [];
    
    for (const range of ranges) {
      try {
        console.log(`🔍 Test range: ${range}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: range,
        });
        
        const rows = response.data.values || [];
        console.log(`📊 ${rows.length} lignes trouvées`);
        
        results.push({
          range,
          rows_count: rows.length,
          rows: rows.slice(0, 10), // Premières 10 lignes seulement
          structure_analysis: {
            first_row_cells: rows[0]?.length || 0,
            non_empty_rows: rows.filter(row => row && row.length > 0).length,
            max_columns: Math.max(...rows.map(row => row?.length || 0))
          }
        });
        
      } catch (error) {
        console.warn(`⚠️ Impossible de lire ${range}:`, error);
        results.push({
          range,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
    
    // Essayer de lister les onglets disponibles
    let sheetsInfo = null;
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      sheetsInfo = spreadsheet.data.sheets?.map(sheet => ({
        title: sheet.properties?.title,
        sheetId: sheet.properties?.sheetId,
        gridProperties: sheet.properties?.gridProperties
      }));
    } catch (error) {
      console.warn('Impossible de lister les onglets:', error);
    }

    return NextResponse.json({
      success: true,
      sheets_info: sheetsInfo,
      range_tests: results,
    });

  } catch (error) {
    console.error('❌ Erreur exploration structure:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}