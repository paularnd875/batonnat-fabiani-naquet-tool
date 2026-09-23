import { NextResponse } from 'next/server';
import { getAllAssignments } from '@/lib/assignments-store';
import { getTeamMembers } from '@/lib/team-store';
import { getLawyerMap } from '@/lib/lawyer-lookup';

export async function GET() {
  try {
    console.log(' Récupération statistiques équipe...');

    // 1. Récupérer tous les membres d'équipe (Vercel Blob)
    const teamMembers = [...(await getTeamMembers())].sort((a, b) =>
      a.prenom.localeCompare(b.prenom)
    );

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({
        success: true,
        team_stats: [],
        message: 'Aucun membre d\'équipe trouvé'
      });
    }

    // 2. Récupérer toutes les assignations (Vercel Blob) + infos avocats (Sheet)
    const [assignments, lawyerMap] = await Promise.all([
      getAllAssignments(),
      getLawyerMap(),
    ]);

    // 3. Pour chaque membre, agréger ses assignations
    const teamStats = teamMembers.map((member) => {
      const memberAssignments = assignments
        .filter((a) => a.team_member_id === member.id)
        .sort((a, b) => (a.assigned_at < b.assigned_at ? 1 : -1));

      const formattedAssignments = memberAssignments.map((assignment) => {
        const lawyer = lawyerMap.get(assignment.lawyer_prenomnom);
        return {
          lawyer_prenomnom: assignment.lawyer_prenomnom,
          lawyer_nom_complet: lawyer?.nom_complet,
          lawyer_cabinet: lawyer?.cabinet,
          lawyer_classement: lawyer?.classement,
          assigned_at: assignment.assigned_at
        };
      });

      return {
        id: member.id,
        prenom: member.prenom,
        nom: member.nom,
        email: member.email,
        total_assignments: formattedAssignments.length,
        assigned_lawyers: formattedAssignments
      };
    });

    // 4. Trier par nombre d'assignations (décroissant)
    teamStats.sort((a, b) => b.total_assignments - a.total_assignments);

    console.log(` Statistiques calculées pour ${teamStats.length} membres`);
    console.log(' Répartition:', teamStats.map((m) => `${m.prenom} ${m.nom}: ${m.total_assignments}`));

    return NextResponse.json({
      success: true,
      team_stats: teamStats,
      summary: {
        total_members: teamStats.length,
        total_assignments: teamStats.reduce((sum, member) => sum + member.total_assignments, 0),
        members_with_assignments: teamStats.filter((m) => m.total_assignments > 0).length
      }
    });

  } catch (error) {
    console.error(' Erreur API team-stats:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      team_stats: []
    }, { status: 500 });
  }
}
