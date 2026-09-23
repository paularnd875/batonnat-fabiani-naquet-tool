import { NextResponse } from 'next/server';
import { getTeamMembers, addTeamMember, removeTeamMember } from '@/lib/team-store';
import { getAllAssignments } from '@/lib/assignments-store';

// Équipe stockée dans Vercel Blob (plus de Supabase).

// GET - Récupérer tous les membres d'équipe
export async function GET() {
  try {
    const members = await getTeamMembers();
    members.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''));
    return NextResponse.json({ success: true, team_members: members });
  } catch (error) {
    console.error('Erreur récupération équipe:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// POST - Ajouter un membre d'équipe
export async function POST(request: Request) {
  try {
    const { prenom, nom, email } = await request.json();
    if (!prenom || !nom || !email) {
      return NextResponse.json({ success: false, error: 'Prénom, nom et email requis' }, { status: 400 });
    }
    const member = await addTeamMember({ prenom, nom, email });
    return NextResponse.json({ success: true, team_member: member });
  } catch (error) {
    console.error('Erreur ajout membre équipe:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// DELETE - Supprimer un membre d'équipe (refusé s'il a des assignations)
export async function DELETE(request: Request) {
  try {
    const { team_member_id } = await request.json();
    if (!team_member_id) {
      return NextResponse.json({ success: false, error: 'team_member_id requis' }, { status: 400 });
    }

    const assignments = await getAllAssignments();
    const count = assignments.filter((a) => a.team_member_id === team_member_id).length;
    if (count > 0) {
      return NextResponse.json({
        success: false,
        error: `Impossible de supprimer ce membre : ${count} assignation(s) en cours. Désassignez d'abord tous les avocats.`,
      }, { status: 400 });
    }

    const ok = await removeTeamMember(team_member_id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Membre d'équipe supprimé avec succès" });
  } catch (error) {
    console.error('Erreur suppression membre équipe:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
