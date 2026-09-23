import { NextResponse } from 'next/server';
import { getAllAssignments } from '@/lib/assignments-store';

export async function GET() {
  try {
    console.log(' Calcul des cabinets LIVE (Google Sheets + Vercel Blob)...');

    // Statistiques cabinets calculées à la volée depuis le service unifié
    const { unifiedData } = await import('@/lib/unified-data');
    const cabinetStats = await unifiedData.getCabinetStatistics(false);
    const allLawyers = await unifiedData.getAllLawyersWithStatuses(false);

    // Assignations (soutiens) depuis Vercel Blob pour assigned_count
    const assignments = await getAllAssignments();
    const assignedLawyersSet = new Set(assignments.map((a) => a.lawyer_prenomnom));

    allLawyers.forEach((lawyer: any) => {
      if (assignedLawyersSet.has(lawyer.prenomnom)) {
        const cabinet = lawyer.cabinet || 'Individuel';
        const stats = cabinetStats.get(cabinet);
        if (stats) {
          stats.assigned_count++;
        }
      }
    });

    // « Couverture » = part des avocats du cabinet déjà assignés
    const allFirms = Array.from(cabinetStats.values()).map((firm: any) => ({
      ...firm,
      participation_rate: firm.lawyer_count > 0 ? (firm.assigned_count || 0) / firm.lawyer_count : 0,
    }));

    // Trier par nombre d'avocats décroissant
    allFirms.sort((a, b) => b.lawyer_count - a.lawyer_count);

    console.log(` ${allFirms.length} cabinets calculés`);

    return NextResponse.json({
      success: true,
      firms: allFirms,
      count: allFirms.length,
    });

  } catch (error) {
    console.error('Erreur récupération cabinets:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
