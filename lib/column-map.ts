// Résolution des colonnes du Google Sheet par NOM d'en-tête (tolérant), avec
// l'index historique en filet de sécurité. Objectif : pouvoir réordonner /
// insérer / supprimer des colonnes de l'onglet source sans casser la
// synchronisation, tant que les TITRES d'en-tête ci-dessous restent présents.
//
// L'outil se repère UNIQUEMENT sur le NOM des en-têtes listés dans FIELDS
// ci-dessous : ce sont les seules colonnes « porteuses ». Toute autre colonne
// peut être supprimée ou déplacée librement. Diagnostic en direct : /diagnostic.

// Onglet source. Identifié de façon ROBUSTE par son gid (immuable, survit aux
// renommages) ; MAIN_TAB n'est qu'un titre de secours si le gid est introuvable.
// (gid 1751345422 = ex-« Copie de Onglet… », renommé « Base principale - V2 ».)
export const SOURCE_TAB_GID = 1751345422;
export const MAIN_TAB = 'Base principale - V2';

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

// Champs lus depuis l'onglet source « Copie de Onglet sans qq colonnes et
// rebougées (pour client) » du classeur 260915 Data | Batonnat Fabiani-Naquet.
// Les en-têtes contiennent parfois des retours à la ligne : normalizeHeader les
// écrase en un seul espace, donc les `names` sont en version aplatie/normalisée.
// La résolution par NOM est PRIORITAIRE ; les `fallback` (positions actuelles de
// cet onglet) ne servent que si le nom d'en-tête a disparu — ils dérivent dès
// qu'une colonne est supprimée/déplacée, d'où la règle : garder les en-têtes.
export const FIELDS: FieldDef[] = [
  { key: 'prenomnom', label: 'Clé (prenom1particulenom)', names: ['prenom1particulenom', 'nomcomplet', 'prenomnom'], fallback: 0 },
  { key: 'civilite', label: 'Civilité (F/M)', names: ['cnb_civilit', 'nature', 'civilite'], fallback: 1, optional: true },
  // Sur l'onglet client, CNB_civilit est vide → on dérive F/M depuis la salutation « Cher / chère » (voir getLawyers).
  { key: 'civilite_salutation', label: 'Salutation (Cher / chère)', names: ['cher / chere'], fallback: 2, optional: true },
  // Nom et prénom sont lus depuis leurs colonnes dédiées (fini le split de nom_complet).
  { key: 'nom_seul', label: 'Nom', names: ['nom'], fallback: 5, optional: true },
  { key: 'prenom_seul', label: 'Prénom', names: ['prenom1'], fallback: 7, optional: true },
  { key: 'nom_complet', label: 'Nom complet', names: ['prenom1 particule nom', 'nom complet'], fallback: 8 },
  { key: 'telephone', label: 'Téléphone', names: ['cnb_cbtel', 'numero de telephone', 'telephone'], fallback: 9, optional: true },
  { key: 'email', label: 'Email', names: ['cnb_avmelordre', 'adresse e-mail', 'email', 'e-mail'], fallback: 15 },
  { key: 'annee_serment', label: 'Année de serment', names: ['annee_serment', 'annee de serment'], fallback: 22, optional: true },
  { key: 'statut_cabinet', label: 'Statut cabinet (mode exercice)', names: ['mode_exe', 'mode_exe (data gouv)'], fallback: 28, optional: true },
  { key: 'cabinet', label: 'Cabinet / Structure (raison sociale = clé technique)', names: ['st_raison_sociale', 'structure', 'cabinet'], fallback: 31 },
  // Nom commercial du cabinet (plus lisible) : utilisé pour l'AFFICHAGE ; la
  // raison sociale reste la clé de regroupement/routing. Voir `cabinet_display` (getLawyers).
  { key: 'cabinet_nom_commercial', label: 'Cabinet (nom commercial)', names: ['cabinet_nom_commercial'], fallback: 80, optional: true },
  { key: 'classement', label: 'Classement C123 (agrégés)', names: ['c123 (agreges - listes envoyees par binome)', 'c123 (agreges)'], fallback: 55 },
  { key: 'origine', label: 'Origine C123', names: ['c123 (origine - listes envoyees par binome)', 'c123 origine'], fallback: 56, optional: true },
  { key: 'soutien_public', label: 'Soutien public', names: ['soutiens publics (impauto typeform)', 'soutiens publics'], fallback: 57, optional: true },
  { key: 'linkedin_mhf', label: 'Réseau LinkedIn MHF', names: ['linkedin mhf (source : mhf)', 'linkedin mhf'], fallback: 58, optional: true },
  { key: 'linkedin_fn', label: 'Réseau LinkedIn FN', names: ['linkedin fn (source : fn)', 'linkedin fn'], fallback: 59, optional: true },
  { key: 'photo_url', label: 'Photo (URL PDP)', names: ['url_pdp', 'url_pdp (appscript)', 'url image', 'url pdp'], fallback: 51, optional: true },

  // --- Phase 2 : champs profil supplémentaires (filtres/badges) ---
  { key: 'xp', label: 'Ancienneté (tranche)', names: ['xp'], fallback: 27, optional: true },
  { key: 'specialite', label: 'Spécialité', names: ["specialite / domaine d'activite", 'specialite'], fallback: 38, optional: true },
  { key: 'mandat', label: 'Mandat', names: ['mandat'], fallback: 39, optional: true },
  { key: 'langue', label: 'Langue(s)', names: ['langue'], fallback: 41, optional: true },
  { key: 'nationalite', label: 'Nationalité', names: ['nationalite'], fallback: 42, optional: true },
  { key: 'tranche_taille_cabinet', label: 'Tranche taille cabinet', names: ['tranche taille cabinet'], fallback: 34, optional: true },
  { key: 'siren', label: 'SIREN', names: ['siren'], fallback: 29, optional: true },
  { key: 'st_siren', label: 'SIREN structure', names: ['st_siren'], fallback: 36, optional: true },
  { key: 'nbr_occur_siren', label: 'Nb occ. SIREN', names: ['nbr_occur_siren'], fallback: 30, optional: true },
  { key: 'elus_statut', label: 'Élu 2026 (statut)', names: ['avocats elus 2026 (statut)'], fallback: 72, optional: true },
  { key: 'elus_certitude', label: 'Élu 2026 (degré de certitude)', names: ['avocats elus 2026 (degres certitude)'], fallback: 73, optional: true },

  // --- Phase 2 : cercles / réseaux (source : MHF) ---
  { key: 'cercle_trombi_stelicla', label: 'Cercle Trombinoscope Stelicla', names: ['trombinoscope stelicla (source : mhf)'], fallback: 62, optional: true },
  { key: 'cercle_corse', label: 'Cercle Corse', names: ['corse (source : mhf)'], fallback: 63, optional: true },
  { key: 'cercle_lawyhers', label: "Cercle Lawy'hers", names: ["lawy'hers (source : mhf)"], fallback: 64, optional: true },
  { key: 'cercle_assas', label: 'Cercle Assas', names: ['assas (source : mhf)'], fallback: 65, optional: true },
  { key: 'cercle_paw', label: 'Cercle PAW', names: ['paw (source : mhf)'], fallback: 66, optional: true },
  { key: 'cercle_juristes_interallies', label: 'Cercle Juristes interalliés', names: ['juristes interallies (source : mhf)'], fallback: 67, optional: true },
  { key: 'cercle_aapi', label: 'Cercle AAPI', names: ['aapi (source : mhf)'], fallback: 68, optional: true },
  { key: 'cercle_spe_pi', label: 'Cercle Avocats Spé Propriété Intellectuelle', names: ['avocats spe propriete intellectuelle (source : mhf)'], fallback: 69, optional: true },
];

// Table des cercles / réseaux (source : MHF) : clé de champ -> libellé affiché.
// Sert à construire le tableau `cercles` d'un avocat (liste des cercles où sa
// valeur vaut '1') et à alimenter les filtres côté UI.
export const CERCLES: { key: string; label: string }[] = [
  { key: 'cercle_corse', label: 'Corse' },
  { key: 'cercle_lawyhers', label: "Lawy'hers" },
  { key: 'cercle_assas', label: 'Assas' },
  { key: 'cercle_paw', label: 'PAW' },
  { key: 'cercle_juristes_interallies', label: 'Juristes interalliés' },
  { key: 'cercle_aapi', label: 'AAPI' },
  { key: 'cercle_spe_pi', label: 'Avocats Spé Propriété Intellectuelle' },
  { key: 'cercle_trombi_stelicla', label: 'Trombinoscope Stelicla' },
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

// Résolution PAR NOM UNIQUEMENT. Le filet « par position » (fallback) a été
// retiré volontairement : puisque des colonnes sont supprimées/déplacées côté
// source, un secours positionnel attrape silencieusement la MAUVAISE colonne.
// Si aucun nom accepté n'est trouvé → champ manquant (index -1 → valeur vide),
// jamais une colonne erronée. Le champ `fallback` de FieldDef est conservé pour
// documentation/compat mais n'est plus utilisé par la résolution.
export function resolveFields(headers: unknown[]): ResolvedField[] {
  const normalized = headers.map(normalizeHeader);
  return FIELDS.map((f) => {
    const byName = normalized.findIndex((h) => h !== '' && f.names.includes(h));
    const found = byName >= 0;
    return {
      key: f.key,
      label: f.label,
      index: found ? byName : -1,
      status: (found ? 'name' : 'missing') as ColStatus,
      header: found ? String(headers[byName] ?? '') : '',
      col: found ? colLetter(byName) : '—',
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
