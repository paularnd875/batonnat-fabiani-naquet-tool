import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Testing Google Sheets connection...');
    
    // Test de connexion avec Google Sheets
    const testData = await googleSheets.testConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Connexion Google Sheets réussie !',
      timestamp: new Date().toISOString(),
      rowCount: testData.length,
      sample: testData.slice(0, 3), // 3 premières lignes pour debug
      headers: testData[0] || [], // Entêtes
    });
  } catch (error) {
    console.error('Google Sheets test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    }, { status: 500 });
  }
}