import { NextResponse } from 'next/server';
import { memoryCache, CACHE_KEYS } from '@/lib/cache';
import { googleSheets } from '@/lib/google-sheets';

export async function POST() {
  try {
    console.log('🔄 FORCE REFRESH: Invalidation du cache...');
    
    // Vider complètement le cache
    memoryCache.delete(CACHE_KEYS.LAWYERS_ALL);
    memoryCache.delete('lawyers_cache');
    memoryCache.delete('vote_data');
    
    console.log('🧹 Cache vidé');
    
    // Recharger les données
    const lawyers = await googleSheets.readLawyers();
    console.log(`📊 ${lawyers.length} avocats rechargés`);
    
    // Statistiques mise à jour
    const statusCounts = {
      C1: lawyers.filter(l => l.classement === 'C1').length,
      C2: lawyers.filter(l => l.classement === 'C2').length,
      C3: lawyers.filter(l => l.classement === 'C3').length,
      Blacklist: lawyers.filter(l => l.classement === 'Blacklist').length,
      'Non classifié': lawyers.filter(l => !l.classement || l.classement === 'Non classifié').length
    };
    
    return NextResponse.json({
      success: true,
      message: 'Cache rafraîchi avec succès',
      stats: {
        total_lawyers: lawyers.length,
        status_distribution: statusCounts,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur force refresh:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}