import { google } from 'googleapis';

// Journalise chaque action d'assignation faite dans l'outil dans un onglet
// dedie du Google Sheet (append-only). N'ecrit JAMAIS dans les donnees : onglet
// separe cree automatiquement au premier usage.
// Prerequis : le service account doit avoir l'acces "Editeur" sur la feuille.

const TAB_NAME = 'Journal actions outil';
const HEADER = [
  'Horodatage',
  'Avocat',
  'Prénom+Nom (clé)',
  "Membre d'équipe",
  'Action',
  'Utilisateur',
  'Nom normalisé',
];

// Reproduit fidelement l'Apps Script uniformizeText : supprime ponctuation,
// espaces, accents, chiffres et emojis, met en minuscules et tout colle.
// Ex : "Jean Michel De Préssense" -> "jeanmicheldepressense"
function normalizeName(input: string): string {
  let s = String(input || '');
  s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"’‘]/g, ''); // ponctuation
  s = s.replace(/\s/g, ''); // espaces
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); // accents (diacritiques)
  s = s.replace(/Ã§/g, 'c'); // mojibake "ç" (Ã§)
  s = s.replace(/[0-9]/g, ''); // chiffres
  s = s
    .replace(/\p{Extended_Pictographic}/gu, '') // emojis / pictogrammes
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '') // drapeaux (indicateurs regionaux)
    .replace(/[‍︎️]/g, ''); // ZWJ + selecteurs de variante
  return s.toLowerCase();
}

function getConfig() {
  let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!credentialsJson || !sheetId) throw new Error('Google Sheets credentials not configured');
  // Support cle encodee en base64 (comme lib/google-sheets.ts)
  if (credentialsJson.startsWith('ey') || credentialsJson.includes('base64:')) {
    const base64Data = credentialsJson.replace('base64:', '');
    credentialsJson = Buffer.from(base64Data, 'base64').toString('utf-8');
  }
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

let tabEnsured = false;

async function ensureTab(sheets: ReturnType<typeof getConfig>['sheets'], sheetId: string): Promise<void> {
  if (tabEnsured) return;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets || []).some(s => s.properties?.title === TAB_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
    });
  }
  // Toujours (re)poser l'en-tete complet (couvre l'ajout de colonnes).
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${TAB_NAME}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADER] },
  });
  tabEnsured = true;
}

export interface AssignmentLog {
  avocat?: string; // nom complet de l'avocat
  prenomnom?: string; // cle prenomnom
  membre?: string; // prenom + nom du membre d'equipe
  action: string; // 'Assignation' | 'Désassignation'
  utilisateur?: string;
}

export async function logAssignmentAction(log: AssignmentLog): Promise<{ ok: boolean; error?: string }> {
  try {
    const { sheets, sheetId } = getConfig();
    await ensureTab(sheets, sheetId);
    const horodatage = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    const row = [
      horodatage,
      log.avocat || log.prenomnom || '',
      log.prenomnom || '',
      log.membre || '',
      log.action,
      log.utilisateur || 'Equipe Fabiani-Naquet',
      normalizeName(log.avocat || log.prenomnom || ''),
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    return { ok: true };
  } catch (e) {
    // Best-effort : ne jamais casser l'action si le journal echoue.
    console.error('[sheet-log] echec journalisation:', e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
