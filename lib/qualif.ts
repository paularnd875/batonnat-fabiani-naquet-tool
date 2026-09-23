import { google } from 'googleapis';
import crypto from 'crypto';
import { memoryCache } from './cache';
import { SOURCE_TAB_GID, MAIN_TAB } from './column-map';
import { logClassifChange } from './qualif-journal';

// Coeur de l'outil "Qualification des contacts" (interface swipe).
// Tout est stocke dans le meme Google Sheet que le reste de l'outil Fabiani-Naquet :
//  - un onglet de config `_QUALIF_ACCESS` : la liste des participants + leurs
//    jetons (liens perso), le reseau et l'onglet cible.
//  - un onglet PAR participant (ex. « Qualif — Frédéric ») : ses reponses
//    (append/upsert par ID) = registre durable ET source de reprise.
// Aucune donnee source n'est modifiee, aucune ecriture dans le `classement`
// global : chaque choix est propre au participant. La reconciliation (admin)
// permet de reperer les profils classes ici mais pas encore reportes au doc.

const CONFIG_TAB = '_QUALIF_ACCESS';
const CONFIG_HEADER = ['id', 'name', 'token', 'network', 'tabName', 'active', 'cursor', 'createdAt'];
const ANSWER_HEADER = ['Horodatage', 'ID', 'Nom complet', 'Cabinet', 'LinkedIn', 'Cercle'];

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID non configure.');
  return id;
}

// Reseaux disponibles (les 2 candidats). La liste d'un candidat = UNION de tous
// ses canaux (LinkedIn + Outlook + Telephone). `select` = en-tetes dont le OR
// (via `present`) definit l'appartenance ; `sources` = canaux affiches en badge ;
// `otherLinkedin` = en-tete LinkedIn de l'AUTRE candidat (badge « aussi connu de … »).
// Les colonnes OUTLOOK n'existent pas encore dans le Sheet : `present` renvoie
// false pour elles, donc elles n'ajoutent rien et s'activeront automatiquement
// quand elles seront ajoutees.
export interface NetworkDef {
  label: string;
  select: string[];
  sources: { label: string; headers: string[] }[];
  otherLabel: string;
  otherLinkedin: string;
}

export const NETWORKS: Record<string, NetworkDef> = {
  frederic: {
    label: 'Frédéric',
    select: ['LINKEDIN FN (source : FN)', 'OUTLOOK FN', 'TÉLÉPHONE FN (source : FN)'],
    sources: [
      { label: 'LinkedIn', headers: ['LINKEDIN FN (source : FN)'] },
      { label: 'Outlook', headers: ['OUTLOOK FN'] },
      { label: 'Téléphone', headers: ['TÉLÉPHONE FN (source : FN)'] },
    ],
    otherLabel: 'Marie-Hélène',
    otherLinkedin: 'LINKEDIN MHF (source : MHF)',
  },
  marieHelene: {
    label: 'Marie-Hélène',
    select: ['LINKEDIN MHF (source : MHF)', 'OUTLOOK MHF', 'TÉLÉPHONE MHF (source : MHF)'],
    sources: [
      { label: 'LinkedIn', headers: ['LINKEDIN MHF (source : MHF)'] },
      { label: 'Outlook', headers: ['OUTLOOK MHF'] },
      { label: 'Téléphone', headers: ['TÉLÉPHONE MHF (source : MHF)'] },
    ],
    otherLabel: 'Frédéric',
    otherLinkedin: 'LINKEDIN FN (source : FN)',
  },
};

// --- Lecture de la base source (par NOM d'en-tete) --------------------------

// On lit l'onglet source (resolu par gid) en A:CZ, on garde la ligne 0 comme
// en-tetes et on construit un tableau d'objets { raw_data: { header: value } }
// (keye par en-tete, colonnes a en-tete vide ignorees). But : pouvoir resoudre
// n'importe quelle colonne par NOM. Cache 2 min via memoryCache.
export interface QualifRow {
  raw_data: Record<string, string>;
}
const SHEET_CACHE_KEY = 'qualif:sheetdata';

function getSheets() {
  let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}';
  if (credentialsJson.startsWith('ey') || credentialsJson.includes('base64:')) {
    const base64Data = credentialsJson.replace('base64:', '');
    credentialsJson = Buffer.from(base64Data, 'base64').toString('utf-8');
  }
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Titre de l'onglet source resolu par gid (immuable, survit aux renommages),
// mis en cache en memoire pour la duree de vie du process.
let sourceTabTitle: string | null = null;
async function getSourceTabTitle(sheets: ReturnType<typeof getSheets>): Promise<string> {
  if (sourceTabTitle) return sourceTabTitle;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: getSheetId(),
      fields: 'sheets.properties(sheetId,title)',
    });
    const match = (meta.data.sheets || []).find((s) => s.properties?.sheetId === SOURCE_TAB_GID);
    sourceTabTitle = match?.properties?.title || MAIN_TAB;
  } catch {
    sourceTabTitle = MAIN_TAB;
  }
  return sourceTabTitle;
}

async function getSheetData(): Promise<QualifRow[]> {
  const cached = memoryCache.get<QualifRow[]>(SHEET_CACHE_KEY);
  if (cached) return cached;
  const sheets = getSheets();
  const title = await getSourceTabTitle(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${q(title)}!A:CZ`,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) {
    memoryCache.set(SHEET_CACHE_KEY, [], 120000);
    return [];
  }
  const headers = (rows[0] || []).map((h) => String(h ?? ''));
  const out: QualifRow[] = rows.slice(1).map((r): QualifRow => {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h.trim() === '') return; // ignore colonnes a en-tete vide
      raw[h] = String(r[i] ?? '');
    });
    return { raw_data: raw };
  });
  memoryCache.set(SHEET_CACHE_KEY, out, 120000);
  return out;
}

// Lecture tolerante de raw_data par NOM d'en-tete (accents/casse/espaces ignores).
// On resout les en-tetes UNE fois (index normalise -> cle exacte) pour eviter de
// re-scanner toutes les colonnes a chaque ligne.
function normH(h: string): string {
  return String(h || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
type Raw = Record<string, string> | undefined;
interface Resolver {
  val: (raw: Raw, header: string) => string;
  bool: (raw: Raw, header: string) => boolean;
  present: (raw: Raw, header: string) => boolean;
  headerStartingWith: (prefix: string) => string | null;
}
const EMPTY_FLAGS = new Set(['0', 'false', 'non', 'no']);
function makeResolver(sample: Raw): Resolver {
  const idx: Record<string, string> = {};
  for (const k of Object.keys(sample || {})) {
    const n = normH(k);
    if (!(n in idx)) idx[n] = k;
  }
  const val = (raw: Raw, header: string) => String((raw as Record<string, string>)?.[idx[normH(header)]] ?? '').trim();
  return {
    val,
    bool: (raw, header) => {
      const s = val(raw, header).toLowerCase();
      return s === '1' || s === 'true' || s === 'oui' || s === 'x';
    },
    // Valeur non-vide ET pas un flag negatif : les colonnes Telephone / LinkedIn
    // contiennent des numeros / URLs, pas des flags '1'.
    present: (raw, header) => {
      const s = val(raw, header);
      return s !== '' && !EMPTY_FLAGS.has(s.toLowerCase());
    },
    // Retrouve la cle exacte d'un en-tete dont la forme normalisee COMMENCE par
    // `prefix` (deja normalise). Utile pour le classement source « C123 (agreges… ».
    headerStartingWith: (prefix) => {
      for (const [n, key] of Object.entries(idx)) {
        if (n.startsWith(prefix)) return key;
      }
      return null;
    },
  };
}
function inNetwork(R: Resolver, raw: Raw, net: NetworkDef): boolean {
  return net.select.some((h) => R.present(raw, h));
}

// Prefixe normalise du classement source « C123 (agreges - listes envoyees… ».
const SOURCE_CLASSEMENT_PREFIX = normH('c123 (agreges');

export interface Participant {
  id: string;
  name: string;
  token: string;
  network: string; // cle de NETWORKS
  tabName: string;
  active: boolean;
  cursor: number;
  createdAt: string;
  rowIndex: number; // ligne dans _QUALIF_ACCESS (1-based, en-tete = 1)
}

export interface QualifContact {
  id: string;
  name: string;
  cabinet: string;
  sizeBracket: string; // tranche de taille du cabinet ('' si inconnue)
  origins: string[]; // canaux du candidat ou figure ce contact (LinkedIn/Outlook/Telephone)
  sharedWith: string; // nom de l'autre candidat si connu de lui aussi, sinon ''
  anneeSerment: string;
  linkedin: string;
  photo: string;
  circle: string; // choix precedent du participant ('' si aucun)
}

function q(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

async function tabExists(sheets: ReturnType<typeof getSheets>, title: string): Promise<boolean> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSheetId(), fields: 'sheets.properties.title' });
  return (meta.data.sheets || []).some((s) => s.properties?.title === title);
}

async function ensureTab(sheets: ReturnType<typeof getSheets>, title: string, header: string[]): Promise<void> {
  if (!(await tabExists(sheets, title))) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${q(title)}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
}

function newToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function newId(): string {
  return crypto.randomBytes(6).toString('hex');
}

// --- Config (_QUALIF_ACCESS) ------------------------------------------------

export async function readParticipants(): Promise<Participant[]> {
  const sheets = getSheets();
  await ensureTab(sheets, CONFIG_TAB, CONFIG_HEADER);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: getSheetId(), range: `${q(CONFIG_TAB)}!A2:H` });
  const rows = res.data.values || [];
  return rows
    .map((r, i): Participant | null => {
      const id = String(r[0] || '').trim();
      if (!id) return null;
      return {
        id,
        name: String(r[1] || ''),
        token: String(r[2] || ''),
        network: String(r[3] || ''),
        tabName: String(r[4] || ''),
        active: String(r[5] || '').toUpperCase() !== 'FALSE',
        cursor: Number(r[6]) || 0,
        createdAt: String(r[7] || ''),
        rowIndex: i + 2,
      };
    })
    .filter((p): p is Participant => p !== null);
}

export async function findByToken(token: string): Promise<Participant | null> {
  const t = String(token || '').trim();
  if (!t) return null;
  const all = await readParticipants();
  return all.find((p) => p.token === t) || null;
}

export async function createParticipant(name: string, network: string): Promise<Participant> {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Nom requis.');
  if (!NETWORKS[network]) throw new Error('Reseau inconnu.');
  const sheets = getSheets();
  await ensureTab(sheets, CONFIG_TAB, CONFIG_HEADER);

  const existing = await readParticipants();
  let tabName = `Qualif — ${clean}`;
  let n = 2;
  const taken = new Set(existing.map((p) => p.tabName));
  while (taken.has(tabName)) tabName = `Qualif — ${clean} (${n++})`;

  const p: Participant = {
    id: newId(),
    name: clean,
    token: newToken(),
    network,
    tabName,
    active: true,
    cursor: 0,
    createdAt: new Date().toISOString(),
    rowIndex: 0,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${q(CONFIG_TAB)}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[p.id, p.name, p.token, p.network, p.tabName, 'TRUE', '0', p.createdAt]] },
  });
  await ensureTab(sheets, tabName, ANSWER_HEADER);
  return p;
}

async function writeCell(rowIndex: number, col: string, value: string): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${q(CONFIG_TAB)}!${col}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

export async function setActive(id: string, active: boolean): Promise<void> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  await writeCell(p.rowIndex, 'F', active ? 'TRUE' : 'FALSE');
}

export async function rotateToken(id: string): Promise<string> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  const token = newToken();
  await writeCell(p.rowIndex, 'C', token);
  return token;
}

export async function deleteParticipant(id: string): Promise<void> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  const sheets = getSheets();
  // On vide la ligne de config (on ne supprime pas physiquement pour ne pas
  // decaler les rowIndex des autres). L'onglet de reponses reste intact.
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${q(CONFIG_TAB)}!A${p.rowIndex}:H${p.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '', '', '']] },
  });
}

// --- Reponses (onglet par participant) --------------------------------------

async function readAnswers(tabName: string): Promise<Map<string, { circle: string; rowIndex: number }>> {
  const sheets = getSheets();
  await ensureTab(sheets, tabName, ANSWER_HEADER);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: getSheetId(), range: `${q(tabName)}!A2:F` });
  const rows = res.data.values || [];
  const map = new Map<string, { circle: string; rowIndex: number }>();
  rows.forEach((r, i) => {
    const id = String(r[1] || '').trim();
    if (id) map.set(id, { circle: String(r[5] || '').trim(), rowIndex: i + 2 });
  });
  return map;
}

// --- Construction de la liste d'un participant ------------------------------

export async function buildContacts(p: Participant): Promise<QualifContact[]> {
  const net = NETWORKS[p.network];
  if (!net) throw new Error('Reseau inconnu pour ce participant.');
  const [data, answers] = await Promise.all([getSheetData(), readAnswers(p.tabName)]);
  const R = makeResolver(data[0]?.raw_data);
  const sourceClassHeader = R.headerStartingWith(SOURCE_CLASSEMENT_PREFIX);

  const list = data
    .filter((l) => {
      if (!inNetwork(R, l.raw_data, net)) return false;
      // Exclure si l'avocat est deja classe dans la source (classement non-vide).
      const sourceVal = sourceClassHeader ? R.val(l.raw_data, sourceClassHeader) : '';
      return sourceVal.trim() === '';
    })
    .map((l): QualifContact | null => {
      const raw = l.raw_data;
      const id = R.val(raw, 'prenom1particulenom');
      if (!id) return null;
      const bracket = R.val(raw, 'Tranche taille cabinet');
      const cabinet = R.present(raw, 'CABINET_NOM_COMMERCIAL')
        ? R.val(raw, 'CABINET_NOM_COMMERCIAL')
        : R.val(raw, 'ST_RAISON_SOCIALE');
      return {
        id,
        name: R.val(raw, 'PRENOM1 PARTICULE NOM') || id,
        cabinet,
        sizeBracket: bracket && !/non trouv/i.test(bracket) ? bracket : '',
        origins: net.sources.filter((s) => s.headers.some((h) => R.present(raw, h))).map((s) => s.label),
        sharedWith: R.present(raw, net.otherLinkedin) ? net.otherLabel : '',
        anneeSerment: R.val(raw, 'ANNEE_SERMENT'),
        linkedin: R.val(raw, 'LINKEDIN'),
        photo: R.val(raw, 'URL_PDP'),
        circle: answers.get(id)?.circle || '',
      };
    })
    .filter((c): c is QualifContact => c !== null);

  list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return list;
}

export interface ParticipantStats extends Participant {
  networkLabel: string;
  total: number;
  answered: number;
}

export async function listWithStats(): Promise<ParticipantStats[]> {
  const participants = await readParticipants();
  if (participants.length === 0) return [];
  const data = await getSheetData();
  const R = makeResolver(data[0]?.raw_data);
  const out: ParticipantStats[] = [];
  for (const p of participants) {
    const net = NETWORKS[p.network];
    const total = net ? data.filter((l) => inNetwork(R, l.raw_data, net)).length : 0;
    let answered = 0;
    try {
      answered = (await readAnswers(p.tabName)).size;
    } catch {
      answered = 0;
    }
    out.push({ ...p, networkLabel: net?.label || p.network, total, answered });
  }
  return out;
}

const VALID_CHOICES = new Set(['C1', 'C2', 'C3', 'Blacklist', 'Neutre']);

export async function saveChoice(
  p: Participant,
  contact: { id: string; name: string; cabinet: string; linkedin: string },
  choice: string,
): Promise<void> {
  if (!VALID_CHOICES.has(choice)) throw new Error('Choix invalide.');
  const sheets = getSheets();
  const answers = await readAnswers(p.tabName);
  const horodatage = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const previous = answers.get(contact.id)?.circle || '';
  const row = [horodatage, contact.id, contact.name, contact.cabinet, contact.linkedin, choice];

  const existing = answers.get(contact.id);
  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${q(p.tabName)}!A${existing.rowIndex}:F${existing.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range: `${q(p.tabName)}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  }

  // Journal global (best-effort) : attribue au participant.
  await logClassifChange({
    nom: contact.name,
    cabinet: contact.cabinet,
    ancienne: previous,
    nouvelle: choice,
    utilisateur: p.name,
  });
}

// --- Reconciliation avec le doc principal -----------------------------------

// Pour chaque participant, compare ses reponses de swipe (C1/C2/C3/Blacklist ;
// « Neutre » ignore) au classement SOURCE de l'avocat dans le doc principal.
// Renvoie la liste des profils classes dans le swipe mais dont la valeur source
// differe (donc PAS encore reportes dans le doc principal).
export interface ReconcileEntry {
  participant: string;
  id: string;
  name: string;
  cabinet: string;
  choice: string;
  source: string;
}

export async function reconcileWithSource(): Promise<ReconcileEntry[]> {
  const participants = await readParticipants();
  if (participants.length === 0) return [];
  const data = await getSheetData();
  const R = makeResolver(data[0]?.raw_data);
  const sourceClassHeader = R.headerStartingWith(SOURCE_CLASSEMENT_PREFIX);

  // Index des lignes source par id (prenom1particulenom).
  const byId = new Map<string, Raw>();
  for (const l of data) {
    const id = R.val(l.raw_data, 'prenom1particulenom');
    if (id) byId.set(id, l.raw_data);
  }

  const out: ReconcileEntry[] = [];
  for (const p of participants) {
    let answers: Map<string, { circle: string; rowIndex: number }>;
    try {
      answers = await readAnswers(p.tabName);
    } catch {
      continue;
    }
    for (const [id, a] of answers) {
      const choice = a.circle;
      if (!['C1', 'C2', 'C3', 'Blacklist'].includes(choice)) continue; // ignore 'Neutre' / vide
      const raw = byId.get(id);
      const source = raw && sourceClassHeader ? R.val(raw, sourceClassHeader).trim() : '';
      if (source !== choice) {
        const cabinet = raw
          ? (R.present(raw, 'CABINET_NOM_COMMERCIAL')
              ? R.val(raw, 'CABINET_NOM_COMMERCIAL')
              : R.val(raw, 'ST_RAISON_SOCIALE'))
          : '';
        out.push({
          participant: p.name,
          id,
          name: raw ? R.val(raw, 'PRENOM1 PARTICULE NOM') || id : id,
          cabinet,
          choice,
          source: source || '(vide)',
        });
      }
    }
  }
  return out;
}
