import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { resolveFields, colLetter, MAIN_TAB, SOURCE_TAB_GID } from '@/lib/column-map';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Résout titre + en-têtes de l'onglet source par gid (robuste au renommage).
async function readSource(): Promise<{ title: string; headers: string[] }> {
  let cj = process.env.GOOGLE_SERVICE_ACCOUNT_KEY as string;
  const sid = process.env.GOOGLE_SHEET_ID as string;
  if (cj && (cj.startsWith('ey') || cj.includes('base64:'))) {
    cj = Buffer.from(cj.replace('base64:', ''), 'base64').toString('utf-8');
  }
  const credentials = JSON.parse(cj);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid, fields: 'sheets.properties(sheetId,title)' });
  const match = (meta.data.sheets || []).find((s: any) => s.properties?.sheetId === SOURCE_TAB_GID);
  const title = match?.properties?.title || MAIN_TAB;
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${title}'!1:1` });
  return { title, headers: (r.data.values?.[0] || []) as string[] };
}

export async function GET() {
  try {
    const { title, headers } = await readSource();
    const fields = resolveFields(headers);

    const parName = fields.filter(f => f.status === 'name').length;
    const parIndex = fields.filter(f => f.status === 'fallback').length;
    const manquants = fields.filter(f => f.status === 'missing').length;

    return NextResponse.json({
      success: true,
      onglet: title,
      ongletGid: SOURCE_TAB_GID,
      totalColonnes: headers.length,
      resume: { trouvesParNom: parName, secoursParIndex: parIndex, manquants },
      champs: fields.map(f => ({
        champ: f.label,
        cle: f.key,
        statut: f.status,
        colonne: f.col,
        enTeteTrouve: f.header,
        nomsAcceptes: f.acceptedNames,
        optionnel: f.optional,
      })),
      enTetes: headers.map((h, i) => ({ colonne: colLetter(i), titre: String(h ?? '') })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
