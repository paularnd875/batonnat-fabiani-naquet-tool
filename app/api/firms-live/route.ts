import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    // 🚀 OPTIMISATION: Vérifier le cache en premier
    const cachedFirmsStats = memoryCache.get(CACHE_KEYS.FIRMS_STATS);
    if (cachedFirmsStats) {
      console.log('🚀 Statistiques cabinets chargées depuis le cache (ULTRA RAPIDE!)');
      return NextResponse.json({
        success: true,
        source: 'Cache (Google Sheets)',
        ...cachedFirmsStats
      });
    }

    console.log('🏢 Calcul statistiques cabinets LIVE depuis Google Sheets...');
    const startTime = Date.now();

    // 1. Lire tous les avocats directement depuis Google Sheets (optimisé avec cache)
    const allLawyers = await googleSheets.readLawyers();
    console.log(`📋 ${allLawyers.length} avocats lus depuis Google Sheets`);

    // 2. Calculer les stats par cabinet avec participation basée sur votes
    const cabinetStats = new Map();
    
    allLawyers.forEach((lawyer: any) => {
      const cabinet = lawyer.cabinet || 'Individuel';
      const displayName = cabinet === 'Individuel' ? 'Avocats en individuel' : cabinet;
      
      if (!cabinetStats.has(cabinet)) {
        cabinetStats.set(cabinet, {
          name: displayName,
          lawyer_count: 0,
          c1_count: 0,
          c2_count: 0,
          c3_count: 0,
          bl_count: 0,
          soutien_public_count: 0,
          unclassified_count: 0,
          assigned_count: 0,
          vote_count: 0,
          participation_rate: 0
        });
      }

      const stats = cabinetStats.get(cabinet);
      stats.lawyer_count++;
      
      // CORRECTION: Compter les votes au lieu des assignations pour la participation
      if (lawyer.premier_tour_vote || lawyer.second_tour_vote) {
        stats.vote_count++;
      }
      
      if (lawyer.soutien_public) stats.soutien_public_count++;
      
      switch (lawyer.classement) {
        case 'C1': stats.c1_count++; break;
        case 'C2': stats.c2_count++; break;
        case 'C3': stats.c3_count++; break;
        case 'Blacklist': stats.bl_count++; break;
        default: stats.unclassified_count++; break;
      }
    });

    // 3. Récupérer les assignations depuis Supabase (pour assigned_count seulement)
    const { data: assignments } = await supabase
      .from('assignments')
      .select('lawyer_prenomnom');

    const assignedLawyersSet = new Set(assignments?.map((a: any) => a.lawyer_prenomnom) || []);
    
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

    // 5. Récupérer les taux de participation depuis les données Google Sheets (plus précis)
    const { data: firmsData } = await supabase
      .from('firms_data')
      .select('*');

    let participationRatesMap = new Map<string, number>();
    
    try {
      const firmsParticipationData = await googleSheets.readFirmsData();
      console.log(`📊 ${firmsParticipationData.length} taux de participation récupérés depuis Google Sheets`);
      
      firmsParticipationData.forEach((firmData: any) => {
        // Normaliser les noms pour éviter les erreurs de matching
        let normalizedName = firmData.cabinet;
        if (normalizedName === 'Individuel') {
          normalizedName = 'Avocats en individuel';
        }
        participationRatesMap.set(normalizedName, firmData.taux_participation_moyen);
        
        // Debug des premiers
        if (firmsParticipationData.indexOf(firmData) < 3) {
          console.log(`📋 ${normalizedName}: ${(firmData.taux_participation_moyen * 100).toFixed(1)}% participation`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Taux de participation Google Sheets non disponibles, utilisation calcul local');
    }

    // 6. Finaliser avec les taux de participation depuis Google Sheets
    const cabinetsArray = Array.from(cabinetStats.values()).map((firm: any) => {
      let participationRate = participationRatesMap.get(firm.name);
      
      // Si pas trouvé dans Google Sheets, utiliser le calcul local basé sur les votes
      if (participationRate === undefined) {
        participationRate = firm.lawyer_count > 0 ? firm.vote_count / firm.lawyer_count : 0;
        if (firm.vote_count > 0) {
          console.log(`⚠️ Calcul local pour ${firm.name}: ${firm.vote_count}/${firm.lawyer_count} = ${(participationRate * 100).toFixed(1)}%`);
        }
      }
      
      return {
        ...firm,
        participation_rate: participationRate || 0
      };
    });

    // 7. Trier par nombre d'avocats décroissant
    cabinetsArray.sort((a, b) => b.lawyer_count - a.lawyer_count);

    console.log(`✅ ${cabinetsArray.length} cabinets calculés avec statistiques LIVE`);

    // Afficher quelques exemples pour debugging
    const examples = cabinetsArray.filter((c: any) => 
      c.soutien_public_count > 0 || c.c1_count > 0 || c.c2_count > 0 || c.c3_count > 0
    ).slice(0, 5);
    
    console.log('📋 Exemples cabinets avec classifications LIVE:');
    examples.forEach((cabinet: any) => {
      console.log(`   ${cabinet.name}: SP:${cabinet.soutien_public_count}, C1:${cabinet.c1_count}, C2:${cabinet.c2_count}, C3:${cabinet.c3_count}, BL:${cabinet.bl_count}`);
    });

    const processingDuration = Date.now() - startTime;
    console.log(`⚡ Calcul terminé en ${processingDuration}ms`);

    // 🚀 OPTIMISATION: Mettre en cache le résultat pour 10 minutes
    const result = {
      source: 'Google Sheets LIVE + Supabase assignments',
      timestamp: new Date().toISOString(),
      firms: cabinetsArray,
      count: cabinetsArray.length
    };
    
    memoryCache.set(CACHE_KEYS.FIRMS_STATS, result, CACHE_TTL.STATS);
    console.log(`💾 Statistiques de ${cabinetsArray.length} cabinets mises en cache pour 30 minutes`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Erreur firms live:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}