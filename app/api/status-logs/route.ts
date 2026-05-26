import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user-info');
    
    if (!userInfoCookie) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non connecté'
      }, { status: 401 });
    }

    const db = getDatabase();
    const logs = db.getStatusChangeLogs();
    
    return NextResponse.json({
      success: true,
      logs: logs
    });

  } catch (error) {
    console.error('❌ Erreur récupération logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}