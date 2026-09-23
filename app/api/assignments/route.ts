import { NextResponse } from 'next/server';
import {
  getAllAssignments,
  addAssignment,
  removeAssignments,
  type StoredAssignment,
} from '@/lib/assignments-store';
import { getTeamMembers, type TeamMember } from '@/lib/team-store';
import { getLawyerMap } from '@/lib/lawyer-lookup';
import { logAssignmentAction } from '@/lib/sheet-log';
import { writeCurrentAssignments } from '@/lib/sheet-assignments';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Assignations stockées dans Vercel Blob. Chaque mutation est journalisée dans le
// Google Sheet (append-only) et l'état courant y est miroité (best-effort).

// Recalcule et réécrit l'état courant des assignations dans le Google Sheet.
async function mirrorToSheet(assignments: StoredAssignment[], members: TeamMember[]) {
  try {
    const lawyerMap = await getLawyerMap();
    const memberMap = new Map(members.map((m) => [m.id, `${m.prenom} ${m.nom}`.trim()]));
    const rows = assignments.map((a) => ({
      avocat: lawyerMap.get(a.lawyer_prenomnom)?.nom_complet || a.lawyer_prenomnom,
      prenomnom: a.lawyer_prenomnom,
      membre: memberMap.get(a.team_member_id) || a.team_member_id,
      assigned_at: a.assigned_at,
    }));
    await writeCurrentAssignments(rows);
  } catch (e) {
    console.warn('Miroir Sheet (best-effort) échoué:', e);
  }
}

// GET - Historique des assignations (enrichi avocat + membre)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const [assignments, members, lawyerMap] = await Promise.all([
      getAllAssignments(),
      getTeamMembers(),
      getLawyerMap(),
    ]);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const sorted = [...assignments].sort(
      (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    );
    const total = sorted.length;
    const pageItems = sorted.slice(offset, offset + limit);

    const formatted = pageItems.map((a) => {
      const lw = lawyerMap.get(a.lawyer_prenomnom);
      const mb = memberMap.get(a.team_member_id);
      return {
        id: a.id,
        lawyer_prenomnom: a.lawyer_prenomnom,
        assigned_at: a.assigned_at,
        assigned_by: mb ? `${mb.prenom} ${mb.nom}`.trim() : 'Système',
        status: 'assigned',
        notes: null,
        lawyer_nom_complet: lw?.nom_complet || null,
        lawyer_cabinet: lw?.cabinet || null,
        lawyer_classement: lw?.classement || null,
        lawyer_email: lw?.email || null,
        lawyer_telephone: lw?.telephone || null,
        lawyer_civilite: lw?.civilite || null,
      };
    });

    return NextResponse.json({
      success: true,
      assignments: formatted,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(' Erreur API assignations (GET):', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      assignments: [],
    }, { status: 500 });
  }
}

// POST - Créer une assignation (multi-soutiens, idempotent)
export async function POST(request: Request) {
  try {
    const { lawyer_prenomnom, team_member_id } = await request.json();
    if (!lawyer_prenomnom || !team_member_id) {
      return NextResponse.json({ success: false, error: 'lawyer_prenomnom et team_member_id requis' }, { status: 400 });
    }

    const [members, lawyerMap] = await Promise.all([getTeamMembers(), getLawyerMap()]);
    const member = members.find((m) => m.id === team_member_id);
    if (!member) {
      return NextResponse.json({ success: false, error: "Membre d'équipe introuvable" }, { status: 404 });
    }
    const lawyer = lawyerMap.get(lawyer_prenomnom);
    if (lawyer?.classement === 'Blacklist') {
      return NextResponse.json({ success: false, error: "Impossible d'assigner un avocat blacklisté" }, { status: 400 });
    }

    const { created, assignment, all } = await addAssignment(lawyer_prenomnom, team_member_id);

    if (created) {
      await logAssignmentAction({
        avocat: lawyer?.nom_complet || lawyer_prenomnom,
        prenomnom: lawyer_prenomnom,
        membre: `${member.prenom} ${member.nom}`.trim(),
        action: 'Assignation',
      });
      await mirrorToSheet(all, members);
    }

    return NextResponse.json({
      success: true,
      assignment: {
        ...assignment,
        team_members: { id: member.id, prenom: member.prenom, nom: member.nom, email: member.email },
      },
    });
  } catch (error) {
    console.error('Erreur assignation (POST):', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// DELETE - Retirer une assignation (un soutien précis, ou tous). Idempotent.
export async function DELETE(request: Request) {
  try {
    const { lawyer_prenomnom, team_member_id } = await request.json();
    if (!lawyer_prenomnom) {
      return NextResponse.json({ success: false, error: 'lawyer_prenomnom requis' }, { status: 400 });
    }

    const { removed, all } = await removeAssignments(lawyer_prenomnom, team_member_id);

    if (removed.length > 0) {
      const [members, lawyerMap] = await Promise.all([getTeamMembers(), getLawyerMap()]);
      const memberMap = new Map(members.map((m) => [m.id, m]));
      const lw = lawyerMap.get(lawyer_prenomnom);
      for (const ex of removed) {
        const mb = memberMap.get(ex.team_member_id);
        await logAssignmentAction({
          avocat: lw?.nom_complet || lawyer_prenomnom,
          prenomnom: lawyer_prenomnom,
          membre: mb ? `${mb.prenom} ${mb.nom}`.trim() : '',
          action: 'Désassignation',
        });
      }
      await mirrorToSheet(all, members);
    }

    return NextResponse.json({
      success: true,
      message: `Assignation supprimée (${removed.length} ligne(s))`,
      debug: { lawyer_prenomnom, team_member_id: team_member_id || null, deleted_count: removed.length },
    });
  } catch (error) {
    console.error(' Erreur suppression assignation (DELETE):', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}
