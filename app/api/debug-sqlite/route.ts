import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Vérifier les logs de changement de statut
    const allLogs = db.getAllStatusChangeLogs();
    const unexportedCount = db.getUnexportedStatusChangesCount();
    const latestStatuses = db.getAllLatestStatuses();
    
    // Chercher spécifiquement Virginie Domain
    const virginieLogs = allLogs.filter(log => 
      log.lawyer_id.toLowerCase().includes('virginie') ||
      log.lawyer_prenom.toLowerCase().includes('virginie') ||
      log.lawyer_nom.toLowerCase().includes('domain')
    );
    
    const virginieStatus = latestStatuses.get('virginie-domain') || 
                          latestStatuses.get('VIRGINIE-DOMAIN') ||
                          latestStatuses.get('VirginieDomain') ||
                          latestStatuses.get('VIRGINIEDOMAIN');
    
    return NextResponse.json({
      success: true,
      debug: {
        totalLogs: allLogs.length,
        unexportedCount,
        latestStatusesCount: latestStatuses.size,
        virginieLogs,
        virginieStatus,
        allLatestStatuses: Array.from(latestStatuses.entries()).slice(0, 10), // Premier 10 pour debug
        recentLogs: allLogs.slice(0, 5), // 5 plus récents
        isVercel: process.env.VERCEL === '1',
        dbPath: process.env.VERCEL === '1' ? '/tmp/logs.db' : 'local'
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur debug SQLite:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}