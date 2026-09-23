import { google } from 'googleapis';

// Miroir de l'ÉTAT COURANT des assignations dans un onglet Google Sheet dédié.
// Complète le journal append-only (« Journal actions outil ») : ici on réécrit à
// chaque changement la liste complète des assignations en cours, pour un contrôle
// simple « qui soutient qui » directement dans le classeur.
//
// Best-effort : n'interrompt jamais l'action utilisateur si l'écriture échoue.

const TAB_NAME = 'Assignations (état courant)';
const HEADER = ['Horodatage MAJ', 'Avocat', 'Prénom+Nom (clé)', "Membre d'équipe", 'Assigné le'];

export interface CurrentAssignmentRow {
  avocat: string;
  prenomnom: string;
  membre: string;
  assigned_at: string;
}

function getConfig() {
  let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!credentialsJson || !sheetId) throw new Error('Google Sheets credentials not configured');
  if (credentialsJson.startsWith('ey') || credentialsJson.includes('base64:')) {
    credentialsJson = Buffer.from(credentialsJson.replace('base64:', ''), 'base64').toString('utf-8');
  }
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

async function ensureTab(sheets: any, sheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets || []).some((s: any) => s.properties?.title === TAB_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
    });
  }
}

/** Réécrit l'onglet « Assignations (état courant) » avec la liste fournie. */
export async function writeCurrentAssignments(rows: CurrentAssignmentRow[]): Promise<void> {
  try {
    const { sheets, sheetId } = getConfig();
    await ensureTab(sheets, sheetId);
    const stamp = new Date().toISOString();
    const values = [
      HEADER,
      ...rows.map((r) => [stamp, r.avocat, r.prenomnom, r.membre, r.assigned_at]),
    ];
    // On efface l'onglet puis on réécrit tout (état courant complet).
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `'${TAB_NAME}'!A:Z` });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  } catch (e) {
    console.warn('Miroir assignations Sheet (best-effort) échoué:', e);
  }
}
