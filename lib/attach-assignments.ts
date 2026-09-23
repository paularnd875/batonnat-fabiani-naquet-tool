import { getAllAssignments } from './assignments-store';
import { getTeamMembers } from './team-store';

// Attache à chaque avocat sa liste d'assignations (soutiens), au format attendu
// par le front (LawyerCard) : assignments[].team_members = { id, prenom, nom, email }.
// Source : Vercel Blob (plus de Supabase).

export interface AttachedAssignment {
  id: string;
  team_member_id: string;
  assigned_at: string;
  team_members: { id: string; prenom: string; nom: string; email: string } | null;
}

export async function attachAssignments<T extends { prenomnom: string }>(
  lawyers: T[]
): Promise<(T & { assignments: AttachedAssignment[] })[]> {
  const [assignments, members] = await Promise.all([getAllAssignments(), getTeamMembers()]);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const byLawyer = new Map<string, AttachedAssignment[]>();
  for (const a of assignments) {
    const mb = memberMap.get(a.team_member_id);
    const entry: AttachedAssignment = {
      id: a.id,
      team_member_id: a.team_member_id,
      assigned_at: a.assigned_at,
      team_members: mb ? { id: mb.id, prenom: mb.prenom, nom: mb.nom, email: mb.email } : null,
    };
    const arr = byLawyer.get(a.lawyer_prenomnom) || [];
    arr.push(entry);
    byLawyer.set(a.lawyer_prenomnom, arr);
  }

  return lawyers.map((l) => ({ ...l, assignments: byLawyer.get(l.prenomnom) || [] }));
}
