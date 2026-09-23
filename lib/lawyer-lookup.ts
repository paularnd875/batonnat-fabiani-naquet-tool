import { googleSheets } from './google-sheets';
import type { SheetLawyer } from './google-sheets';

// Recherche d'avocats par clé (prenomnom) depuis le Google Sheet (lecture mise en
// cache 60 min dans readLawyers). Sert à enrichir les assignations (nom, cabinet,
// classement…) sans passer par Supabase.

export async function getLawyerMap(): Promise<Map<string, SheetLawyer>> {
  const lawyers = await googleSheets.readLawyers();
  const map = new Map<string, SheetLawyer>();
  for (const l of lawyers) map.set(l.prenomnom, l);
  return map;
}

export async function getLawyer(prenomnom: string): Promise<SheetLawyer | null> {
  const map = await getLawyerMap();
  return map.get(prenomnom) || null;
}
