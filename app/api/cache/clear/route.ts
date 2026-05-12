import { NextResponse } from 'next/server';
import { memoryCache } from '@/lib/cache';

/**
 * API pour vider le cache - utile pour forcer un recalcul
 */
export async function DELETE() {
  try {
    const statsBeforeClear = memoryCache.getStats();
    
    // Vider complètement le cache
    memoryCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache vidé avec succès',
      clearedEntries: statsBeforeClear.cacheSize,
      statsBeforeClear
    });

  } catch (error) {
    console.error('❌ Erreur vidage cache:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST endpoint pour compatibilité
 */
export async function POST() {
  return DELETE();
}