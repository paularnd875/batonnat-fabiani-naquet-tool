import { readSnapshot, writeSnapshot } from './blob-store';

// Assignations (soutiens) stockées dans Vercel Blob. Remplace la table Supabase
// `assignments`. Relation N-N (multi-soutiens) : un avocat peut être assigné à
// plusieurs membres, unicité sur le couple (avocat, membre).
//
// Chaque mutation est aussi journalisée dans le Google Sheet (append-only) et
// l'état courant y est miroité (voir lib/sheet-assignments.ts), pour la
// traçabilité et un contrôle possible.

export interface StoredAssignment {
  id: string;
  lawyer_prenomnom: string;
  team_member_id: string;
  assigned_at: string;
}

const PREFIX = 'assignments/';

export async function getAllAssignments(): Promise<StoredAssignment[]> {
  return readSnapshot<StoredAssignment[]>(PREFIX, []);
}

export async function saveAllAssignments(list: StoredAssignment[]): Promise<void> {
  await writeSnapshot(PREFIX, list);
}

/** Ajoute une assignation (idempotent sur le couple avocat/membre). */
export async function addAssignment(
  lawyer_prenomnom: string,
  team_member_id: string
): Promise<{ created: boolean; assignment: StoredAssignment; all: StoredAssignment[] }> {
  const all = await getAllAssignments();
  const existing = all.find(
    (a) => a.lawyer_prenomnom === lawyer_prenomnom && a.team_member_id === team_member_id
  );
  if (existing) return { created: false, assignment: existing, all };

  const assignment: StoredAssignment = {
    id: crypto.randomUUID(),
    lawyer_prenomnom,
    team_member_id,
    assigned_at: new Date().toISOString(),
  };
  all.push(assignment);
  await saveAllAssignments(all);
  return { created: true, assignment, all };
}

/**
 * Retire des assignations. Si `team_member_id` est fourni, ne retire que ce
 * soutien précis ; sinon retire tous les soutiens de l'avocat.
 * Renvoie les assignations retirées + la liste restante.
 */
export async function removeAssignments(
  lawyer_prenomnom: string,
  team_member_id?: string
): Promise<{ removed: StoredAssignment[]; all: StoredAssignment[] }> {
  const all = await getAllAssignments();
  const matches = (a: StoredAssignment) =>
    a.lawyer_prenomnom === lawyer_prenomnom &&
    (!team_member_id || a.team_member_id === team_member_id);
  const removed = all.filter(matches);
  const kept = all.filter((a) => !matches(a));
  if (removed.length) await saveAllAssignments(kept);
  return { removed, all: kept };
}

/** Assignations d'un avocat donné. */
export async function getAssignmentsByLawyer(
  lawyer_prenomnom: string
): Promise<StoredAssignment[]> {
  const all = await getAllAssignments();
  return all.filter((a) => a.lawyer_prenomnom === lawyer_prenomnom);
}

/** Map prenomnom -> liste des team_member_id assignés (pour enrichir en masse). */
export async function getAssignmentsMap(): Promise<Map<string, string[]>> {
  const all = await getAllAssignments();
  const map = new Map<string, string[]>();
  for (const a of all) {
    const arr = map.get(a.lawyer_prenomnom) || [];
    arr.push(a.team_member_id);
    map.set(a.lawyer_prenomnom, arr);
  }
  return map;
}
