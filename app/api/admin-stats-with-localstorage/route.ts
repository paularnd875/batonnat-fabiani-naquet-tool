import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { localStorageStatuses, localStorageChanges } = await request.json();
    
    // Récupérer les stats normales depuis l'API existante
    const adminStatsResponse = await fetch(request.url.replace('/admin-stats-with-localstorage', '/admin-stats'), {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });
    
    if (!adminStatsResponse.ok) {
      throw new Error('Erreur lors de la récupération des stats admin');
    }
    
    const adminStatsData = await adminStatsResponse.json();
    
    if (!adminStatsData.success) {
      return NextResponse.json(adminStatsData);
    }
    
    // Compter les changements localStorage pour les nouvelles classifications
    let localC1Count = 0;
    let localC2Count = 0;
    let localC3Count = 0;
    let localBlacklistCount = 0;
    
    Object.values(localStorageStatuses).forEach((status: any) => {
      switch (status) {
        case 'C1': localC1Count++; break;
        case 'C2': localC2Count++; break;
        case 'C3': localC3Count++; break;
        case 'Blacklist': localBlacklistCount++; break;
      }
    });
    
    // Enrichir les stats avec les données localStorage
    const enrichedStats = {
      ...adminStatsData.stats,
      // Ajouter les nouvelles classifications localStorage
      localStorageChanges: {
        c1_added: localC1Count,
        c2_added: localC2Count,
        c3_added: localC3Count,
        blacklist_added: localBlacklistCount,
        total_changes: Object.keys(localStorageStatuses).length
      },
      // Nombre de changements non exportés depuis localStorage
      unexportedLogs: localStorageChanges.length
    };
    
    console.log(`🔄 Stats admin avec localStorage: ${Object.keys(localStorageStatuses).length} statuts, ${localStorageChanges.length} changements non exportés`);
    
    return NextResponse.json({
      ...adminStatsData,
      stats: enrichedStats
    });
    
  } catch (error) {
    console.error('❌ Erreur API admin-stats-with-localstorage:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}