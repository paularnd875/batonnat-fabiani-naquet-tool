import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    console.log('Debugging Google Sheets...');
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets credentials not configured',
      }, { status: 500 });
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Lire les métadonnées pour voir les onglets disponibles
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheetNames = metadata.data.sheets?.map((sheet: any) => sheet.properties?.title) || [];

    return NextResponse.json({
      success: true,
      message: 'Métadonnées Google Sheets récupérées',
      timestamp: new Date().toISOString(),
      sheetId,
      availableSheets: sheetNames,
      totalSheets: sheetNames.length,
      serviceAccountEmail: credentials.client_email,
    });
  } catch (error) {
    console.error('Google Sheets debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    }, { status: 500 });
  }
}