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
  origine: string;
  soutien_public: boolean;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  photo_url?: string;
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

    // Supporter l'encodage base64 pour éviter les problèmes d'échappement JSON
    let credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    // Si la variable commence par "ey" ou contient "base64:", c'est du base64
    if (credentialsJson?.startsWith('ey') || credentialsJson?.includes('base64:')) {
      try {
        const base64Data = credentialsJson.replace('base64:', '');
        credentialsJson = Buffer.from(base64Data, 'base64').toString('utf-8');
      } catch (error) {
        console.warn('Failed to decode base64, using as-is:', error);
      }
    }
    
    const credentials = JSON.parse(credentialsJson);
    
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
      range: 'Base principale!A:BU', // Étendu jusqu'à BU pour inclure les photos
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // Première ligne = entêtes pour identifier les colonnes des soutiens précédents
    const headers = rows[0];
    const soutienColumns = this.findSoutienColumns(headers);

    const lawyersData = rows.slice(1).map((row: any[]) => {
      // Extraction des soutiens précédents
      const soutiens: string[] = [];
      soutienColumns.forEach(({ index, binome }) => {
        if (row[index] === '1') {
          soutiens.push(binome);
        }
      });

      return {
        prenomnom: row[0] || '', // nomcomplet
        civilite: row[1] || '', // Nature  
        nom_complet: row[8] || '', // Nom complet
        telephone: row[9] || '', // Numéro de téléphone
        email: row[14] || '', // Adresse e-mail
        annee_serment: parseInt(row[27]) || 0, // Année de serment
        cabinet: row[34] || '', // Structure
        classement: row[47] || '', // Colonne AV (index 47) - Classement agrégé C1/C2/C3
        origine: row[48] || '', // Colonne AW (index 48) - Origine/Prénom
        soutien_public: row[50] === '1', // Colonne AY (index 50) - Soutien public
        soutiens_precedents: soutiens,
        ami_linkedin_mhf: row[60] === '1', // LINKEDIN MHF
        ami_linkedin_fn: row[61] === '1', // LINKEDIN FN
        photo_url: row[72] || '', // Colonne BU (index 72)
        raw_data: row,
      };
    }).filter((lawyer: any) => lawyer.prenomnom); // Filtrer les lignes vides

    // Appliquer la logique de distribution des photos
    return this.distributePhotos(lawyersData);
  }

  /**
   * Lit l'onglet votes et retourne les données de participation
   * Note: Essaie plusieurs onglets possibles pour trouver les bonnes données
   */
  async readFirmsData(): Promise<SheetFirmData[]> {
    // Essayer différents noms d'onglets possibles
    const possibleSheetNames = [
      'Synthèse vote toutes structures!A:G', // Onglet correct avec vraies données
      'Synthèse vote par structure!A:G', // Fallback sur ancien onglet
      // Ajouter d'autres noms possibles si nécessaire
    ];
    
    for (const rangeName of possibleSheetNames) {
      try {
        console.log(`🔍 Tentative lecture onglet: ${rangeName}`);
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: rangeName,
        });
        
        const rows = response.data.values || [];
        if (rows.length === 0) continue;
        
        console.log(`📋 Trouvé ${rows.length} lignes dans ${rangeName}`);
        console.log(`📋 Première ligne:`, rows[0]);
        console.log(`📋 Deuxième ligne:`, rows[1]);
        
        const processedData = this.processFirmsData(rows);
        if (processedData.length > 0) {
          console.log(`✅ ${processedData.length} cabinets valides trouvés`);
          return processedData;
        }
      } catch (error) {
        console.warn(`⚠️ Impossible de lire ${rangeName}:`, error);
        continue;
      }
    }
    
    console.warn('⚠️ Aucun onglet de participation trouvé');
    return [];
  }

  /**
   * Traite les données brutes d'un onglet pour extraire les données de participation
   */
  private processFirmsData(rows: any[][]): SheetFirmData[] {
    if (rows.length === 0) return [];

    return rows.slice(1).map((row: any[]) => {
      const cabinet = (row[0] || '').toString().trim();
      let taux = parseFloat(row[6]) || 0;
      
      // Si le taux > 1, c'est probablement en pourcentage, le convertir en décimal
      if (taux > 1) {
        taux = taux / 100;
      }
      
      return {
        cabinet,
        taux_participation_moyen: taux,
      };
    }).filter(firm => 
      firm.cabinet && 
      firm.cabinet !== 'Structure' && 
      !firm.cabinet.includes('Liste des personnes') &&
      firm.cabinet.length > 2 // Filtrer les noms trop courts
    );
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
      })).filter((member: any) => member.prenom && member.nom && member.email);
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
   * Détermine le classement C1/C2/C3/Blacklist depuis les colonnes du Sheet
   */
  private determineClassement(row: any[]): string {
    // D'après les entêtes vues : C1 (col 44), C2 (col 45), C3 (col 46), Blacklist (col 49)
    if (row[49] === '1') return 'Blacklist';
    if (row[44] === '1') return 'C1';
    if (row[45] === '1') return 'C2'; 
    if (row[46] === '1') return 'C3';
    return ''; // Non classé
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
   * Distribue les photos selon la logique demandée :
   * - Si l'avocat a une photo_url : on l'utilise
   * - Si l'avocat n'a pas de photo_url : on prend une URL au hasard parmi celles disponibles
   */
  private distributePhotos(lawyers: SheetLawyer[]): SheetLawyer[] {
    // Récupérer toutes les URLs de photos disponibles (non vides)
    const availablePhotoUrls = lawyers
      .map(lawyer => lawyer.photo_url)
      .filter(url => url && url.trim() !== '');

    // Si aucune URL disponible, retourner tel quel
    if (availablePhotoUrls.length === 0) {
      return lawyers;
    }

    // Distribuer les photos
    return lawyers.map(lawyer => {
      if (lawyer.photo_url && lawyer.photo_url.trim() !== '') {
        // L'avocat a déjà sa propre photo
        return lawyer;
      } else {
        // L'avocat n'a pas de photo : prendre une URL au hasard
        const randomUrl = availablePhotoUrls[Math.floor(Math.random() * availablePhotoUrls.length)];
        return {
          ...lawyer,
          photo_url: randomUrl
        };
      }
    });
  }

  /**
   * Test de connexion - lit les 10 premières lignes de l'onglet principal
   */
  async testConnection(): Promise<any[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'Base principale!A1:BU10', // Étendu jusqu'à BU pour inclure les photos
    });

    return response.data.values || [];
  }
}

export const googleSheets = new GoogleSheetsService();