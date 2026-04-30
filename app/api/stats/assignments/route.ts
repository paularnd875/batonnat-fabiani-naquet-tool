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

    // Compter les avocats assignés
    const { count: assignedCount, error: assignedError } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true })
      .not('prenomnom', 'in', `(SELECT lawyer_prenomnom FROM assignments)`);

    if (assignedError) throw assignedError;

    // Compter le total d'avocats
    const { count: totalLawyers, error: totalError } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Grouper les assignations par membre d'équipe
    const teamCoverage: { [key: string]: number } = {};
    
    assignments?.forEach((assignment) => {
      const memberId = assignment.team_member_id;
      if (!teamCoverage[memberId]) {
        teamCoverage[memberId] = 0;
      }
      teamCoverage[memberId]++;
    });

    const stats = {
      total_assignments: assignments?.length || 0,
      assigned_lawyers: (totalLawyers || 0) - (assignedCount || 0),
      unassigned_lawyers: assignedCount || 0,
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