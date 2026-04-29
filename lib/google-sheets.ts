import { google } from 'googleapis';

// Interface pour les données d'avocat depuis le Google Sheet
export interface SheetLawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  cabinet: string;
  classement: string;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  raw_data: any;
}

// Interface pour les données de cabinet depuis l'onglet votes
export interface SheetFirmData {
  cabinet: string;
  taux_participation_moyen: number;
}

// Interface pour les membres d'équipe
export interface SheetTeamMember {
  prenom: string;
  nom: string;
  email: string;
}

class GoogleSheetsService {
  private sheets: any;
  private sheetId: string;

  constructor() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('Google Sheets credentials not configured');
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.sheetId = process.env.GOOGLE_SHEET_ID;
  }

  /**
   * Lit l'onglet avocats et retourne les données structurées
   */
  async readLawyers(): Promise<SheetLawyer[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'Base principale!A:BK', // De A à BK comme spécifié
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // Première ligne = entêtes pour identifier les colonnes des soutiens précédents
    const headers = rows[0];
    const soutienColumns = this.findSoutienColumns(headers);

    return rows.slice(1).map((row: any[]) => {
      // Extraction des soutiens précédents
      const soutiens: string[] = [];
      soutienColumns.forEach(({ index, binome }) => {
        if (row[index] === '1') {
          soutiens.push(binome);
        }
      });

      return {
        prenomnom: row[0] || '',
        civilite: row[1] || '',
        nom_complet: row[8] || '',
        telephone: row[9] || '',
        email: row[14] || '',
        annee_serment: parseInt(row[27]) || 0,
        cabinet: row[34] || '',
        classement: row[47] || '',
        soutiens_precedents: soutiens,
        ami_linkedin_mhf: row[57] === '1',
        ami_linkedin_fn: row[58] === '1',
        raw_data: row,
      };
    }).filter(lawyer => lawyer.prenomnom); // Filtrer les lignes vides
  }

  /**
   * Lit l'onglet votes et retourne les données de participation
   */
  async readFirmsData(): Promise<SheetFirmData[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'Synthèse vote par structure!A:G',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    return rows.slice(1).map((row: any[]) => ({
      cabinet: row[0] || '',
      taux_participation_moyen: parseFloat(row[6]) || 0,
    })).filter(firm => firm.cabinet);
  }

  /**
   * Lit l'onglet équipe ou le crée s'il n'existe pas
   */
  async readTeamMembers(): Promise<SheetTeamMember[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'Outil - Équipe!A:C',
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      return rows.slice(1).map((row: any[]) => ({
        prenom: row[0] || '',
        nom: row[1] || '',
        email: row[2] || '',
      })).filter(member => member.prenom && member.nom && member.email);
    } catch (error) {
      // L'onglet n'existe pas, on le crée
      await this.createTeamSheet();
      return [];
    }
  }

  /**
   * Écrit les membres d'équipe dans l'onglet Outil - Équipe
   */
  async writeTeamMembers(members: SheetTeamMember[]): Promise<void> {
    // Vérifier si l'onglet existe, sinon le créer
    try {
      await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'Outil - Équipe!A1',
      });
    } catch (error) {
      await this.createTeamSheet();
    }

    // Préparer les données avec entêtes
    const values = [
      ['prenom', 'nom', 'email'],
      ...members.map(m => [m.prenom, m.nom, m.email])
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: 'Outil - Équipe!A:C',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  /**
   * Écrit une erreur de sync dans l'onglet Outil - Erreurs Sync
   */
  async writeError(type_erreur: string, prenomnom: string, details: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'Outil - Erreurs Sync!A1',
      });
    } catch (error) {
      await this.createErrorsSheet();
    }

    const values = [[
      new Date().toISOString(),
      type_erreur,
      prenomnom,
      details
    ]];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: 'Outil - Erreurs Sync!A:D',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  /**
   * Crée l'onglet Outil - Équipe
   */
  private async createTeamSheet(): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Outil - Équipe'
              }
            }
          }
        ]
      }
    });

    // Ajouter les entêtes
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: 'Outil - Équipe!A1:C1',
      valueInputOption: 'RAW',
      requestBody: { 
        values: [['prenom', 'nom', 'email']]
      },
    });
  }

  /**
   * Crée l'onglet Outil - Erreurs Sync
   */
  private async createErrorsSheet(): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Outil - Erreurs Sync'
              }
            }
          }
        ]
      }
    });

    // Ajouter les entêtes
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: 'Outil - Erreurs Sync!A1:D1',
      valueInputOption: 'RAW',
      requestBody: { 
        values: [['date', 'type_erreur', 'prenomnom', 'details']]
      },
    });
  }

  /**
   * Trouve les colonnes des soutiens précédents (BA, BB, BC, BD)
   */
  private findSoutienColumns(headers: string[]): Array<{ index: number; binome: string }> {
    const result: Array<{ index: number; binome: string }> = [];
    
    // Colonnes BA = index 52, BB = 53, BC = 54, BD = 55 (en base 0)
    const soutienIndices = [52, 53, 54, 55];
    
    soutienIndices.forEach(index => {
      if (headers[index] && headers[index].trim()) {
        result.push({
          index,
          binome: headers[index].trim()
        });
      }
    });

    return result;
  }

  /**
   * Test de connexion - lit les 10 premières lignes de l'onglet principal
   */
  async testConnection(): Promise<any[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'Base principale!A1:BK10', // 10 premières lignes seulement
    });

    return response.data.values || [];
  }
}

export const googleSheets = new GoogleSheetsService();