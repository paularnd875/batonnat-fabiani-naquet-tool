import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('🏢 Calcul statistiques cabinets LIVE depuis Google Sheets...');

    // 1. Lire tous les avocats directement depuis Google Sheets
    const allLawyers = await googleSheets.readLawyers();
    console.log(`📋 ${allLawyers.length} avocats lus depuis Google Sheets`);

    // 2. Calculer les stats par cabinet
    const cabinetStats = new Map();
    
    allLawyers.forEach(lawyer => {
      const cabinet = lawyer.cabinet || 'Individuel';
      
      if (!cabinetStats.has(cabinet)) {
        cabinetStats.set(cabinet, {
          name: cabinet,
          lawyer_count: 0,
          c1_count: 0,
          c2_count: 0,
          c3_count: 0,
          bl_count: 0,
          soutien_public_count: 0,
          unclassified_count: 0,
          assigned_count: 0,
          participation_rate: 0
        });
      }

      const stats = cabinetStats.get(cabinet);
      stats.lawyer_count++;
      
      if (lawyer.soutien_public) stats.soutien_public_count++;
      
      switch (lawyer.classement) {
        case 'C1': stats.c1_count++; break;
        case 'C2': stats.c2_count++; break;
        case 'C3': stats.c3_count++; break;
        case 'Blacklist': stats.bl_count++; break;
        default: stats.unclassified_count++; break;
      }
    });

    // 3. Récupérer les assignations depuis Supabase pour calculer le taux de participation
    const { data: assignments } = await supabase
      .from('assignments')
      .select('lawyer_prenomnom');

    const assignedLawyersSet = new Set(assignments?.map(a => a.lawyer_prenomnom) || []);
    
    // 4. Calculer les taux de participation et assigned_count pour chaque cabinet
    allLawyers.forEach(lawyer => {
      if (assignedLawyersSet.has(lawyer.prenomnom)) {
        const cabinet = lawyer.cabinet || 'Individuel';
        const stats = cabinetStats.get(cabinet);
        if (stats) {
          stats.assigned_count++;
        }
      }
    });

    // 5. Lire les taux de participation depuis Google Sheets si disponibles
    let participationRatesMap = new Map<string, number>();
    try {
      const firmsParticipationData = await googleSheets.readFirmsData();
      firmsParticipationData.forEach(firmData => {
        participationRatesMap.set(firmData.cabinet, firmData.taux_participation_moyen);
      });
    } catch (error) {
      console.warn('⚠️ Taux de participation Google Sheets non disponibles, utilisation calcul local');
    }

    // 6. Finaliser avec les taux de participation
    const cabinetsArray = Array.from(cabinetStats.values()).map(firm => {
      let participationRate = participationRatesMap.get(firm.name);
      
      if (participationRate === undefined) {
        participationRate = firm.lawyer_count > 0 ? firm.assigned_count / firm.lawyer_count : 0;
      }
      
      return {
        ...firm,
        participation_rate: participationRate
      };
    });

    // 7. Trier par nombre d'avocats décroissant
    cabinetsArray.sort((a, b) => b.lawyer_count - a.lawyer_count);

    console.log(`✅ ${cabinetsArray.length} cabinets calculés avec statistiques LIVE`);

    // Afficher quelques exemples pour debugging
    const examples = cabinetsArray.filter(c => 
      c.soutien_public_count > 0 || c.c1_count > 0 || c.c2_count > 0 || c.c3_count > 0
    ).slice(0, 5);
    
    console.log('📋 Exemples cabinets avec classifications LIVE:');
    examples.forEach(cabinet => {
      console.log(`   ${cabinet.name}: SP:${cabinet.soutien_public_count}, C1:${cabinet.c1_count}, C2:${cabinet.c2_count}, C3:${cabinet.c3_count}, BL:${cabinet.bl_count}`);
    });

    return NextResponse.json({
      success: true,
      source: 'Google Sheets LIVE + Supabase assignments',
      timestamp: new Date().toISOString(),
      firms: cabinetsArray,
      count: cabinetsArray.length
    });

  } catch (error) {
    console.error('❌ Erreur firms live:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}