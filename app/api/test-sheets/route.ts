import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Google Sheets connection...');
    
    // Pour l'instant, retournons un message simple pour tester l'API
    return NextResponse.json({
      success: true,
      message: 'API route fonctionne - Google Sheets à configurer',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}