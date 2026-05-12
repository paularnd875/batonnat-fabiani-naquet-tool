import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { memoryCache, CACHE_KEYS } from '@/lib/cache';

/**
 * API de réchauffement du cache - preload les données Google Sheets
 * 🚀 OPTIMISATION: Évite les 60+ secondes d'attente en production
 */
export async function POST() {
  try {
    console.log('🔥 WARM-UP: Démarrage du préchauffage du cache...');
    const startTime = Date.now();

    // Vérifier si les données sont déjà en cache
    const cached = memoryCache.get(CACHE_KEYS.LAWYERS_ALL);
    if (cached) {
      console.log('🚀 WARM-UP: Données déjà en cache, pas de rechargement nécessaire');
      return NextResponse.json({
        success: true,
        message: 'Cache déjà chaud',
        cached: true,
        duration: Date.now() - startTime
      });
    }

    // Précharger les données Google Sheets
    const lawyers = await googleSheets.readLawyers();
    console.log(`🔥 WARM-UP: ${lawyers.length} avocats préchargés en ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      message: `Cache réchauffé avec ${lawyers.length} avocats`,
      cached: false,
      duration: Date.now() - startTime,
      lawyerCount: lawyers.length
    });

  } catch (error) {
    console.error('❌ WARM-UP ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de préchauffage'
    }, { status: 500 });
  }
}

/**
 * GET endpoint pour vérifier l'état du cache
 */
export async function GET() {
  try {
    const cached = memoryCache.get(CACHE_KEYS.LAWYERS_ALL);
    const info = memoryCache.getInfo();
    
    return NextResponse.json({
      success: true,
      cacheStatus: {
        lawyersInCache: !!cached,
        lawyerCount: cached && Array.isArray(cached) ? cached.length : 0,
        cacheInfo: info
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de vérification cache'
    }, { status: 500 });
  }
}