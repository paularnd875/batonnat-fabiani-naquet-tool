import { readSnapshot, writeSnapshot } from './blob-store';

// Équipe de campagne (membres) stockée dans Vercel Blob. Remplace la table
// Supabase `team_members`. Les `id` sont conservés à l'identique lors de la
// migration pour que les assignations existantes (qui référencent ces id)
// restent valides.

export interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  created_at?: string;
}

const PREFIX = 'team/';

export async function getTeamMembers(): Promise<TeamMember[]> {
  return readSnapshot<TeamMember[]>(PREFIX, []);
}

export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const members = await getTeamMembers();
  return members.find((m) => m.id === id) || null;
}

/** Map id -> "Prénom Nom" pour enrichir rapidement les assignations. */
export async function getTeamNameMap(): Promise<Map<string, string>> {
  const members = await getTeamMembers();
  return new Map(members.map((m) => [m.id, `${m.prenom} ${m.nom}`.trim()]));
}

export async function saveTeamMembers(members: TeamMember[]): Promise<void> {
  await writeSnapshot(PREFIX, members);
}

export async function addTeamMember(input: {
  prenom: string;
  nom: string;
  email: string;
  id?: string;
}): Promise<TeamMember> {
  const members = await getTeamMembers();
  const member: TeamMember = {
    id: input.id || crypto.randomUUID(),
    prenom: input.prenom.trim(),
    nom: input.nom.trim(),
    email: input.email.trim(),
    created_at: new Date().toISOString(),
  };
  members.push(member);
  await saveTeamMembers(members);
  return member;
}

export async function updateTeamMember(
  id: string,
  patch: Partial<Pick<TeamMember, 'prenom' | 'nom' | 'email'>>
): Promise<TeamMember | null> {
  const members = await getTeamMembers();
  const idx = members.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  members[idx] = { ...members[idx], ...patch };
  await saveTeamMembers(members);
  return members[idx];
}

export async function removeTeamMember(id: string): Promise<boolean> {
  const members = await getTeamMembers();
  const next = members.filter((m) => m.id !== id);
  if (next.length === members.length) return false;
  await saveTeamMembers(next);
  return true;
}
