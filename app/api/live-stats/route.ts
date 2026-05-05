import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('📊 Calcul statistiques LIVE depuis Google Sheets...');

    // 1. Lire tous les avocats directement depuis Google Sheets
    const allLawyers = await googleSheets.readLawyers();
    console.log(`📋 ${allLawyers.length} avocats lus depuis Google Sheets`);

    // 2. Calculer les statistiques globales
    let totalStats = {
      total_lawyers: allLawyers.length,
      c1_count: 0,
      c2_count: 0,
      c3_count: 0,
      blacklist_count: 0,
      soutien_public_count: 0,
      unclassified_count: 0
    };

    // 3. Calculer les stats par cabinet
    const cabinetStats = new Map();
    
    allLawyers.forEach(lawyer => {
      // Stats globales
      if (lawyer.soutien_public) totalStats.soutien_public_count++;
      
      switch (lawyer.classement) {
        case 'C1': totalStats.c1_count++; break;
        case 'C2': totalStats.c2_count++; break;
        case 'C3': totalStats.c3_count++; break;
        case 'Blacklist': totalStats.blacklist_count++; break;
        default: totalStats.unclassified_count++; break;
      }

      // Stats par cabinet
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
          unclassified_count: 0
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

    const cabinetsArray = Array.from(cabinetStats.values());

    // 4. Afficher quelques exemples pour debug
    console.log('📊 STATISTIQUES LIVE GOOGLE SHEETS:');
    console.log(`   Total avocats: ${totalStats.total_lawyers}`);
    console.log(`   Soutiens publics: ${totalStats.soutien_public_count}`);
    console.log(`   C1: ${totalStats.c1_count}, C2: ${totalStats.c2_count}, C3: ${totalStats.c3_count}`);
    console.log(`   Blacklist: ${totalStats.blacklist_count}`);
    console.log(`   Non classés: ${totalStats.unclassified_count}`);
    console.log(`   Cabinets: ${cabinetsArray.length}`);

    // Quelques exemples de cabinets avec soutiens publics ou classements
    const interessantCabinets = cabinetsArray.filter(c => 
      c.soutien_public_count > 0 || c.c1_count > 0 || c.c2_count > 0 || c.c3_count > 0 || c.bl_count > 0
    ).slice(0, 5);
    
    console.log('📋 Exemples cabinets avec classifications:');
    interessantCabinets.forEach(cabinet => {
      console.log(`   ${cabinet.name}: SP:${cabinet.soutien_public_count}, C1:${cabinet.c1_count}, C2:${cabinet.c2_count}, C3:${cabinet.c3_count}, BL:${cabinet.bl_count}`);
    });

    return NextResponse.json({
      success: true,
      source: 'Google Sheets LIVE',
      timestamp: new Date().toISOString(),
      global_stats: totalStats,
      cabinet_count: cabinetsArray.length,
      sample_cabinets: interessantCabinets.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur statistiques live:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}