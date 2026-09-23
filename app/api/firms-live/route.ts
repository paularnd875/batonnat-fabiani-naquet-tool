import { NextResponse } from 'next/server';
import { getAllAssignments } from '@/lib/assignments-store';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    // 🚀 OPTIMISATION: Vérifier le cache en premier
    const cachedFirmsStats = memoryCache.get(CACHE_KEYS.FIRMS_STATS);
    if (cachedFirmsStats) {
      console.log(' Statistiques cabinets chargées depuis le cache (ULTRA RAPIDE!)');
      return NextResponse.json({
        success: true,
        source: 'Cache (Google Sheets)',
        ...cachedFirmsStats
      });
    }

    console.log(' Calcul statistiques cabinets LIVE avec service unifié...');
    const startTime = Date.now();

    // 🚀 UTILISER LE SERVICE UNIFIÉ pour garantir la cohérence
    const { unifiedData } = await import('@/lib/unified-data');
    const cabinetStats = await unifiedData.getCabinetStatistics(false);
    
    // Récupérer les données unifiées pour les assignations
    const allLawyers = await unifiedData.getAllLawyersWithStatuses(false);

    // 3. Récupérer les assignations depuis Vercel Blob (pour assigned_count)
    const assignments = await getAllAssignments();
    const assignedLawyersSet = new Set(assignments.map((a) => a.lawyer_prenomnom));
    
    // 4. Calculer assigned_count pour chaque cabinet
    allLawyers.forEach((lawyer: any) => {
      if (assignedLawyersSet.has(lawyer.prenomnom)) {
        const cabinet = lawyer.cabinet || 'Individuel';
        const stats = cabinetStats.get(cabinet);
        if (stats) {
          stats.assigned_count++;
        }
      }
    });

    // 5a. Nom commercial (plus lisible) par cabinet (raison sociale), pour l'affichage.
    const nomCommercialMap = new Map<string, string>();
    allLawyers.forEach((lawyer: any) => {
      const rs = lawyer.cabinet;
      const nc = lawyer.cabinet_nom_commercial;
      if (rs && nc && !nomCommercialMap.has(rs)) nomCommercialMap.set(rs, nc);
    });

    // 5b. Conformité : plus de taux de participation aux votes (onglet interdit).
    // La "couverture" d'un cabinet = part de ses avocats déjà assignés à un membre
    // d'équipe (assigned_count / lawyer_count).
    const cabinetsArray = Array.from(cabinetStats.values()).map((firm: any) => {
      const couverture = firm.lawyer_count > 0 ? (firm.assigned_count || 0) / firm.lawyer_count : 0;
      return {
        ...firm,
        participation_rate: couverture,
        taille_cabinet: undefined,
        display_name: nomCommercialMap.get(firm.name) || firm.name,
      };
    });

    // 8. Trier par nombre d'avocats décroissant
    cabinetsArray.sort((a, b) => b.lawyer_count - a.lawyer_count);

    console.log(` ${cabinetsArray.length} cabinets calculés avec statistiques LIVE`);

    // Afficher quelques exemples pour debugging
    const examples = cabinetsArray.filter((c: any) => 
      c.soutien_public_count > 0 || c.c1_count > 0 || c.c2_count > 0 || c.c3_count > 0
    ).slice(0, 5);
    
    console.log(' Exemples cabinets avec classifications LIVE:');
    examples.forEach((cabinet: any) => {
      console.log(`   ${cabinet.name}: SP:${cabinet.soutien_public_count}, C1:${cabinet.c1_count}, C2:${cabinet.c2_count}, C3:${cabinet.c3_count}, BL:${cabinet.bl_count}`);
    });

    const processingDuration = Date.now() - startTime;
    console.log(` Calcul terminé en ${processingDuration}ms`);

    // 🚀 OPTIMISATION: Mettre en cache le résultat pour 10 minutes
    const result = {
      source: 'Google Sheets LIVE + Supabase assignments',
      timestamp: new Date().toISOString(),
      firms: cabinetsArray,
      count: cabinetsArray.length
    };
    
    memoryCache.set(CACHE_KEYS.FIRMS_STATS, result, CACHE_TTL.STATS);
    console.log(` Statistiques de ${cabinetsArray.length} cabinets mises en cache pour 30 minutes`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error(' Erreur firms live:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}