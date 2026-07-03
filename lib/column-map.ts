// Résolution des colonnes du Google Sheet par NOM d'en-tête (tolérant), avec
// l'index historique en filet de sécurité. Objectif : pouvoir réordonner /
// insérer / supprimer des colonnes de l'onglet "Base principale" sans casser la
// synchronisation, tant que les TITRES d'en-tête ci-dessous restent présents.

export const MAIN_TAB = 'Base principale';

export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FieldDef {
  key: string;
  label: string;
  names: string[];
  fallback: number;
  optional?: boolean;
}

// Champs lus par la synchronisation depuis l'onglet principal (batonnat).
export const FIELDS: FieldDef[] = [
  { key: 'prenomnom', label: 'Clé (nomcomplet)', names: ['nomcomplet', 'prenomnom'], fallback: 0 },
  { key: 'civilite', label: 'Civilité', names: ['nature', 'civilite'], fallback: 1, optional: true },
  { key: 'nom_complet', label: 'Nom complet', names: ['nom complet'], fallback: 8 },
  { key: 'telephone', label: 'Téléphone', names: ['numero de telephone', 'numero de portable', 'telephone'], fallback: 9, optional: true },
  { key: 'email', label: 'Email', names: ['adresse e-mail', 'email', 'e-mail'], fallback: 14 },
  { key: 'annee_serment', label: 'Année de serment', names: ['annee de serment'], fallback: 27, optional: true },
  { key: 'statut_cabinet', label: 'Statut cabinet (mode exercice)', names: ['mode_exe (data gouv)', 'mode exe (data gouv)'], fallback: 33, optional: true },
  { key: 'cabinet', label: 'Cabinet / Structure', names: ['structure', 'cabinet'], fallback: 34 },
  { key: 'classement', label: 'Classement C123 (agrégés)', names: ['c123 (agreges)', 'c123 (agrege)'], fallback: 47 },
  { key: 'origine', label: 'Origine C123', names: ['c123 origine'], fallback: 48, optional: true },
  { key: 'soutien_public', label: 'Soutien public', names: ['soutiens publics (impauto soutiens publics typeform)', 'soutiens publics', 'soutien public'], fallback: 50, optional: true },
  { key: 'linkedin_mhf', label: 'Réseau LinkedIn MHF', names: ['linkedin mhf'], fallback: 61, optional: true },
  { key: 'linkedin_fn', label: 'Réseau LinkedIn FN', names: ['linkedin fn'], fallback: 62, optional: true },
  { key: 'photo_url', label: 'Photo (URL Image)', names: ['url image', 'url pdp'], fallback: 72, optional: true },
];

export type ColStatus = 'name' | 'fallback' | 'missing';

export interface ResolvedField {
  key: string;
  label: string;
  index: number;
  status: ColStatus;
  header: string;
  col: string;
  acceptedNames: string[];
  optional: boolean;
}

export function colLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function resolveFields(headers: unknown[]): ResolvedField[] {
  const normalized = headers.map(normalizeHeader);
  return FIELDS.map((f) => {
    const byName = normalized.findIndex((h) => h !== '' && f.names.includes(h));
    let index: number;
    let status: ColStatus;
    if (byName >= 0) {
      index = byName;
      status = 'name';
    } else if (f.fallback < headers.length && String(headers[f.fallback] ?? '').trim() !== '') {
      index = f.fallback;
      status = 'fallback';
    } else {
      index = f.fallback;
      status = 'missing';
    }
    return {
      key: f.key,
      label: f.label,
      index,
      status,
      header: String(headers[index] ?? ''),
      col: colLetter(index),
      acceptedNames: f.names,
      optional: !!f.optional,
    };
  });
}

export function columnIndices(headers: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of resolveFields(headers)) map[r.key] = r.index;
  return map;
}
