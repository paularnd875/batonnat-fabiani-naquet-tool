import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    console.log('Testing Google Sheets connection for photos...');
    
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

    // Test pour récupérer les colonnes A (nom_complet) et BU (photo_url) des 20 premières lignes
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Base principale!A1:BU21', // Header + 20 premières lignes
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune donnée trouvée',
      });
    }

    const headers = rows[0];
    console.log('Headers found:', headers.length, 'columns');
    
    // Trouver l'index de la colonne BU (colonne 73 si on compte A=0)
    const colBUIndex = 72; // BU est la 73ème colonne (A=0, B=1, ..., BU=72)
    
    // Analyser les données
    const dataRows = rows.slice(1);
    const results = dataRows.map((row, index) => {
      const nomComplet = row[0] || '';
      const photoUrl = row[colBUIndex] || '';
      
      return {
        ligne: index + 2, // +2 car on commence à la ligne 2 (ligne 1 = headers)
        nom_complet: nomComplet,
        photo_url: photoUrl,
        has_photo: photoUrl !== ''
      };
    });

    // Compter les stats
    const totalRows = results.length;
    const rowsWithPhotos = results.filter(r => r.has_photo).length;
    const photosUrls = results
      .filter(r => r.has_photo)
      .map(r => r.photo_url);

    return NextResponse.json({
      success: true,
      message: 'Test récupération photos colonne BU',
      timestamp: new Date().toISOString(),
      stats: {
        total_rows_tested: totalRows,
        rows_with_photos: rowsWithPhotos,
        rows_without_photos: totalRows - rowsWithPhotos,
        percentage_with_photos: Math.round((rowsWithPhotos / totalRows) * 100)
      },
      available_photo_urls: photosUrls,
      sample_data: results.slice(0, 5), // 5 premières lignes pour debug
      column_bu_index: colBUIndex,
      total_columns: headers.length
    });
  } catch (error) {
    console.error('Google Sheets photos test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    }, { status: 500 });
  }
}