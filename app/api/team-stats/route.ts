import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('📊 Récupération statistiques équipe...');

    // 1. Récupérer tous les membres d'équipe
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .order('prenom', { ascending: true });

    if (teamError) {
      console.error('Erreur récupération équipe:', teamError);
      throw teamError;
    }

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({
        success: true,
        team_stats: [],
        message: 'Aucun membre d\'équipe trouvé'
      });
    }

    // 2. Pour chaque membre, récupérer ses assignations
    const teamStats = await Promise.all(
      teamMembers.map(async (member: any) => {
        // Récupérer les assignations de ce membre avec les infos des avocats
        const { data: assignments, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            lawyer_prenomnom,
            assigned_at,
            lawyers!inner(
              nom_complet,
              cabinet,
              classement,
              email
            )
          `)
          .eq('team_member_id', member.id)
          .order('assigned_at', { ascending: false });

        if (assignmentError) {
          console.error(`Erreur assignations membre ${member.id}:`, assignmentError);
          return {
            ...member,
            total_assignments: 0,
            assigned_lawyers: []
          };
        }

        // Formater les assignations
        const formattedAssignments = (assignments || []).map(assignment => ({
          lawyer_prenomnom: assignment.lawyer_prenomnom,
          lawyer_nom_complet: (assignment.lawyers as any)?.nom_complet,
          lawyer_cabinet: (assignment.lawyers as any)?.cabinet,
          lawyer_classement: (assignment.lawyers as any)?.classement,
          assigned_at: assignment.assigned_at
        }));

        return {
          id: member.id,
          prenom: member.prenom,
          nom: member.nom,
          email: member.email,
          total_assignments: formattedAssignments.length,
          assigned_lawyers: formattedAssignments
        };
      })
    );

    // 3. Trier par nombre d'assignations (décroissant)
    teamStats.sort((a, b) => b.total_assignments - a.total_assignments);

    console.log(`✅ Statistiques calculées pour ${teamStats.length} membres`);
    console.log('📈 Répartition:', teamStats.map(m => `${m.prenom} ${m.nom}: ${m.total_assignments}`));

    return NextResponse.json({
      success: true,
      team_stats: teamStats,
      summary: {
        total_members: teamStats.length,
        total_assignments: teamStats.reduce((sum, member) => sum + member.total_assignments, 0),
        members_with_assignments: teamStats.filter(m => m.total_assignments > 0).length
      }
    });

  } catch (error) {
    console.error('❌ Erreur API team-stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      team_stats: []
    }, { status: 500 });
  }
}