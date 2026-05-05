import { NextResponse } from 'next/server';
import { memoryCache } from '@/lib/cache';

/**
 * API pour débugger et monitorer le cache
 * Affiche les statistiques et l'état du cache
 */
export async function GET() {
  try {
    const cacheInfo = memoryCache.getInfo();
    
    return NextResponse.json({
      success: true,
      cache: cacheInfo,
      message: `Cache contient ${cacheInfo.totalEntries} entrées avec un taux de succès de ${cacheInfo.hitRate}%`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lecture cache'
    }, { status: 500 });
  }
}

/**
 * API pour vider le cache (utile pour les tests)
 */
export async function DELETE() {
  try {
    memoryCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache vidé avec succès'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur vidage cache'
    }, { status: 500 });
  }
}