import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Statistiques d'assignations
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        team_member_id,
        team_members (
          id,
          prenom,
          nom
        )
      `);

    if (assignmentsError) throw assignmentsError;

    // Compter le total d'avocats
    const { count: totalLawyers, error: totalError } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Compter les différentes catégories
    const { count: c1Count, error: c1Error } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .eq('classement', 'C1');

    const { count: c2Count, error: c2Error } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .eq('classement', 'C2');

    const { count: c3Count, error: c3Error } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .eq('classement', 'C3');

    const { count: blacklistCount, error: blacklistError } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .eq('classement', 'Blacklist');

    const { count: soutienPublicCount, error: soutienError } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .eq('soutien_public', true);

    // Calculer les avocats "vraiment" non assignés
    // = Total - (assignations manuelles + C1 + C2 + C3 + soutiens publics)
    const manuallyAssignedCount = assignments?.length || 0;
    const preAssignedCount = (c1Count || 0) + (c2Count || 0) + (c3Count || 0) + (soutienPublicCount || 0);
    const totalAssignedCount = manuallyAssignedCount + preAssignedCount;
    const unassignedCount = (totalLawyers || 0) - totalAssignedCount;

    // Grouper les assignations par membre d'équipe
    const teamCoverage: { [key: string]: number } = {};
    
    assignments?.forEach((assignment: any) => {
      const memberId = assignment.team_member_id;
      if (!teamCoverage[memberId]) {
        teamCoverage[memberId] = 0;
      }
      teamCoverage[memberId]++;
    });

    const stats = {
      total_assignments: assignments?.length || 0,
      assigned_lawyers: totalAssignedCount,
      unassigned_lawyers: Math.max(0, unassignedCount),
      c1_count: c1Count || 0,
      c2_count: c2Count || 0,
      c3_count: c3Count || 0,
      blacklist_count: blacklistCount || 0,
      soutien_public_count: soutienPublicCount || 0,
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