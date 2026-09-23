import { NextResponse } from 'next/server';
import { getAllAssignments } from '@/lib/assignments-store';
import { getLawyerMap } from '@/lib/lawyer-lookup';

export async function GET() {
  try {
    // Assignations (soutiens) depuis Vercel Blob
    const assignments = await getAllAssignments();

    // Avocats depuis le Google Sheet (pour les totaux et classements)
    const lawyerMap = await getLawyerMap();
    const lawyers = Array.from(lawyerMap.values());

    const totalLawyers = lawyers.length;
    let c1Count = 0;
    let c2Count = 0;
    let c3Count = 0;
    let blacklistCount = 0;
    let soutienPublicCount = 0;

    lawyers.forEach((lawyer) => {
      if (lawyer.soutien_public) soutienPublicCount++;
      switch (lawyer.classement) {
        case 'C1': c1Count++; break;
        case 'C2': c2Count++; break;
        case 'C3': c3Count++; break;
        case 'Blacklist': blacklistCount++; break;
      }
    });

    // Calculer les avocats "vraiment" non assignés
    // = Total - (assignations manuelles + C1 + C2 + C3 + soutiens publics)
    const manuallyAssignedCount = assignments.length;
    const preAssignedCount = c1Count + c2Count + c3Count + soutienPublicCount;
    const totalAssignedCount = manuallyAssignedCount + preAssignedCount;
    const unassignedCount = totalLawyers - totalAssignedCount;

    // Grouper les assignations par membre d'équipe
    const teamCoverage: { [key: string]: number } = {};

    assignments.forEach((assignment) => {
      const memberId = assignment.team_member_id;
      if (!teamCoverage[memberId]) {
        teamCoverage[memberId] = 0;
      }
      teamCoverage[memberId]++;
    });

    const stats = {
      total_assignments: assignments.length,
      assigned_lawyers: totalAssignedCount,
      unassigned_lawyers: Math.max(0, unassignedCount),
      c1_count: c1Count,
      c2_count: c2Count,
      c3_count: c3Count,
      blacklist_count: blacklistCount,
      soutien_public_count: soutienPublicCount,
      team_coverage: teamCoverage,
    };

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Erreur statistiques assignations:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
