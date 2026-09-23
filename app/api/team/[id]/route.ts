import { NextResponse } from 'next/server';
import { getTeamMembers, updateTeamMember, removeTeamMember } from '@/lib/team-store';
import { getAllAssignments } from '@/lib/assignments-store';

// PUT - Mettre à jour un membre d'équipe
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const memberId = resolvedParams.id;
    const body = await request.json();
    const { prenom, nom, email } = body;

    if (!prenom || !nom || !email) {
      return NextResponse.json({
        success: false,
        error: 'Prénom, nom et email requis',
      }, { status: 400 });
    }

    // Vérifier si l'email existe déjà pour un autre membre
    const members = await getTeamMembers();
    const emailTaken = members.some((m) => m.email === email && m.id !== memberId);

    if (emailTaken) {
      return NextResponse.json({
        success: false,
        error: 'Cet email est déjà utilisé par un autre collaborateur',
      }, { status: 400 });
    }

    // Mettre à jour le membre
    const data = await updateTeamMember(memberId, { prenom, nom, email });

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Collaborateur non trouvé',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      team_member: data,
    });

  } catch (error) {
    console.error('Erreur mise à jour membre équipe:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// DELETE - Supprimer un membre d'équipe (refusé s'il a des assignations)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    // Refuser la suppression si le membre a des assignations (soutiens)
    const assignments = await getAllAssignments();
    const hasAssignments = assignments.some((a) => a.team_member_id === memberId);

    if (hasAssignments) {
      return NextResponse.json({
        success: false,
        error: 'Impossible de supprimer ce collaborateur : il a des soutiens assignés',
      }, { status: 400 });
    }

    const removed = await removeTeamMember(memberId);

    if (!removed) {
      return NextResponse.json({
        success: false,
        error: 'Collaborateur non trouvé',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Collaborateur supprimé',
    });

  } catch (error) {
    console.error('Erreur suppression membre équipe:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
