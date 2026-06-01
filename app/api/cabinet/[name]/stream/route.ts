import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

/**
 * API de streaming pour gros cabinets - retourne les données par chunks
 * Évite les timeouts pour les gros volumes (13K+ avocats)
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '50');
    const batchIndex = parseInt(searchParams.get('batchIndex') || '0');
    
    console.log(` Stream API - Cabinet: ${cabinetName}, Batch ${batchIndex} (size: ${batchSize})`);
    
    // Normalisation du nom
    let normalizedCabinetName = cabinetName;
    if (cabinetName === 'Avocats en individuel') {
      normalizedCabinetName = 'Individuel';
    }

    const startTime = Date.now();
    const allLawyersFromSheet = await googleSheets.readLawyers();
    console.log(` Google Sheets lu en ${Date.now() - startTime}ms pour streaming`);

    // Filtrage
    let filteredLawyers;
    if (normalizedCabinetName === 'Individuel') {
      filteredLawyers = allLawyersFromSheet.filter((lawyer: any) => 
        !lawyer.cabinet || lawyer.cabinet.trim() === ''
      );
    } else {
      filteredLawyers = allLawyersFromSheet.filter((lawyer: any) => 
        lawyer.cabinet === normalizedCabinetName
      );
    }

    const totalLawyers = filteredLawyers.length;
    const totalBatches = Math.ceil(totalLawyers / batchSize);
    
    // Calcul du batch
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalLawyers);
    const batchLawyers = filteredLawyers.slice(startIndex, endIndex);
    
    // Tri du batch
    const sortedBatch = batchLawyers.sort((a, b) => {
      if (a.soutien_public && !b.soutien_public) return -1;
      if (!a.soutien_public && b.soutien_public) return 1;
      return (a.nom_complet || a.prenomnom || '').localeCompare(b.nom_complet || b.prenomnom || '');
    });

    const response = {
      success: true,
      cabinet: {
        name: cabinetName,
        lawyers: sortedBatch,
        batchInfo: {
          batchIndex,
          batchSize: sortedBatch.length,
          totalBatches,
          totalLawyers,
          hasMore: batchIndex < totalBatches - 1,
          progress: Math.round(((batchIndex + 1) / totalBatches) * 100)
        }
      },
      performance: {
        loadTime: Date.now() - startTime,
        cacheHit: true // TODO: implémenter la détection de cache
      }
    };

    console.log(` Batch ${batchIndex}/${totalBatches} envoyé (${sortedBatch.length} avocats) en ${Date.now() - startTime}ms`);

    return NextResponse.json(response);

  } catch (error) {
    console.error(' Erreur API streaming:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur streaming',
    }, { status: 500 });
  }
}