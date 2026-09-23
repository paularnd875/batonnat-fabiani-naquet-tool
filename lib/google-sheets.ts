import { google } from 'googleapis';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { columnIndices, CERCLES, MAIN_TAB, SOURCE_TAB_GID } from './column-map';

// Interface pour les données d'avocat depuis le Google Sheet
export interface SheetLawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  cabinet: string;
  cabinet_nom_commercial?: string;
  cabinet_display?: string;
  statut_cabinet: string;
  classement: string;
  origine: string;
  soutien_public: boolean;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  photo_url?: string;
  // Phase 2 : nom/prénom persistés + champs profil + cercles + élus 2026
  nom?: string;
  prenom?: string;
  xp?: string;
  specialite?: string;
  mandat?: string;
  langue?: string;
  nationalite?: string;
  tranche_taille_cabinet?: string;
  siren?: string;
  st_siren?: string;
  nbr_occur_siren?: string;
  elus_statut?: string;
  elus_certitude?: string;
  cercles?: string[];
  // Données de vote du Barreau de Paris 2024
  premier_tour_vote?: boolean;
  second_tour_vote?: boolean;
  raw_data: any;
}

// Interface pour les données de cabinet depuis l'onglet votes
export interface SheetFirmData {
  cabinet: string;
  taux_participation_moyen: number;
  taille_cabinet?: string;
}

// Interface pour les membres d'équipe
export interface SheetTeamMember {
  prenom: string;
  nom: string;
  email: string;
}

// Interface pour les données de vote du Barreau de Paris 2024
export interface SheetVoteData {
  prenomnom: string;
  premier_tour_vote: boolean;
  second_tour_vote: boolean;
}

class GoogleSheetsService {
  private sheets: any;
  private sheetId: string;
  private sourceTabTitle: string | null = null;

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
   * Résout le TITRE de l'onglet source par son gid (immuable), pour survivre aux
   * renommages d'onglet. Fallback sur MAIN_TAB si le gid est introuvable. Le titre
   * est mis en cache pour la durée de vie de l'instance. Renvoie une plage A1
   * citée (le titre peut contenir des espaces).
   */
  private async getSourceRange(suffix: string = 'A:CZ'): Promise<string> {
    if (!this.sourceTabTitle) {
      try {
        const meta = await this.sheets.spreadsheets.get({
          spreadsheetId: this.sheetId,
          fields: 'sheets.properties(sheetId,title)',
        });
        const match = (meta.data.sheets || []).find(
          (s: any) => s.properties?.sheetId === SOURCE_TAB_GID
        );
        this.sourceTabTitle = match?.properties?.title || MAIN_TAB;
        if (match && match.properties.title !== MAIN_TAB) {
          console.log(` Onglet source résolu par gid ${SOURCE_TAB_GID} → "${this.sourceTabTitle}"`);
        }
      } catch (e) {
        console.warn(' Résolution onglet par gid impossible, fallback MAIN_TAB:', e);
        this.sourceTabTitle = MAIN_TAB;
      }
    }
    return `'${this.sourceTabTitle}'!${suffix}`;
  }

  /**
   * Lit l'onglet avocats et retourne les données structurées
   * 🚀 OPTIMISÉ: Utilise un cache mémoire pour éviter les appels répétés à Google Sheets
   */
  async readLawyers(): Promise<SheetLawyer[]> {
    // 🚀 OPTIMISATION: Vérifier le cache en premier
    const cachedLawyers = memoryCache.get<SheetLawyer[]>(CACHE_KEYS.LAWYERS_ALL);
    if (cachedLawyers) {
      console.log(' Données avocats chargées depuis le cache (ULTRA RAPIDE!)');
      return cachedLawyers;
    }

    // Si pas en cache, lire depuis Google Sheets (LENT)
    console.log(' Lecture Google Sheets... (Première fois ou cache expiré)');
    const startTime = Date.now();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: await this.getSourceRange('A:CZ'), // onglet résolu par gid ; résolution par NOM ensuite
    });

    const duration = Date.now() - startTime;
    console.log(` Google Sheets lu en ${duration}ms`);

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const headers = rows[0];

    // Résolution des colonnes par NOM d'en-tête (avec index de secours)
    const idx = columnIndices(headers);
    const at = (row: any[], key: string): string => {
      const i = idx[key];
      return i != null && i >= 0 ? (row[i] || '') : '';
    };

    const lawyersData = rows.slice(1).map((row: any[]) => {
      // Nom / prénom lus depuis leurs colonnes dédiées (NOM / PRENOM1) ;
      // nom_complet reste disponible pour l'affichage.
      const nomComplet = at(row, 'nom_complet');
      const nom = at(row, 'nom_seul');
      const prenom = at(row, 'prenom_seul');

      // Cabinet : `cabinet` = raison sociale (clé technique/regroupement).
      // `cabinet_display` = nom commercial (plus lisible) si présent, sinon raison sociale.
      const cabinetRaisonSociale = at(row, 'cabinet');
      const cabinetNomCommercial = at(row, 'cabinet_nom_commercial');
      const cabinetDisplay = cabinetNomCommercial || cabinetRaisonSociale;

      // Cercles / réseaux : liste des cercles où la valeur vaut '1'.
      const cercles = CERCLES
        .filter(({ key }) => at(row, key) === '1')
        .map(({ label }) => label);

      // Civilité F/M : brute si présente, sinon dérivée de la salutation
      // « Cher / chère » (Chère → F, Cher → M) car l'onglet client ne fournit
      // plus la lettre F/M directement.
      const civBrut = at(row, 'civilite').trim();
      const salut = at(row, 'civilite_salutation')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents (chère → chere)
        .trim().toLowerCase();
      const civilite = civBrut || (salut.startsWith('chere') ? 'F' : salut.startsWith('cher') ? 'M' : '');

      const lawyer = {
        prenomnom: at(row, 'prenomnom'),
        civilite,
        nom_complet: nomComplet,
        nom: nom,
        prenom: prenom,
        telephone: at(row, 'telephone'),
        email: at(row, 'email'),
        annee_serment: parseInt(at(row, 'annee_serment')) || 0,
        cabinet: cabinetRaisonSociale,
        cabinet_nom_commercial: cabinetNomCommercial,
        cabinet_display: cabinetDisplay,
        statut_cabinet: at(row, 'statut_cabinet'),
        classement: at(row, 'classement'),
        origine: at(row, 'origine'),
        soutien_public: at(row, 'soutien_public') === '1',
        // Conformité : les soutiens des campagnes précédentes ne sont plus collectés ni stockés.
        soutiens_precedents: [] as string[],
        ami_linkedin_mhf: at(row, 'linkedin_mhf') === '1',
        ami_linkedin_fn: at(row, 'linkedin_fn') === '1',
        photo_url: at(row, 'photo_url'),
        // Phase 2 : champs profil + cercles + élus 2026
        xp: at(row, 'xp'),
        specialite: at(row, 'specialite'),
        mandat: at(row, 'mandat'),
        langue: at(row, 'langue'),
        nationalite: at(row, 'nationalite'),
        tranche_taille_cabinet: at(row, 'tranche_taille_cabinet'),
        siren: at(row, 'siren'),
        st_siren: at(row, 'st_siren'),
        nbr_occur_siren: at(row, 'nbr_occur_siren'),
        elus_statut: at(row, 'elus_statut'),
        elus_certitude: at(row, 'elus_certitude'),
        cercles,
        raw_data: row,
      };

      return lawyer;
    }).filter((lawyer: any) => lawyer.prenomnom); // Filtrer les lignes vides

    // Appliquer la logique de distribution des photos
    const processedLawyers = this.distributePhotos(lawyersData);

    // Conformité : la participation aux votes des campagnes précédentes n'est plus
    // exploitée (données non conservées). Champs laissés indéfinis.
    const lawyersWithVotes = processedLawyers.map(lawyer => ({
      ...lawyer,
      premier_tour_vote: undefined as boolean | undefined,
      second_tour_vote: undefined as boolean | undefined,
    }));

    // 🚀 OPTIMISATION: Mettre en cache pour 60 minutes (Google Sheets très lent)
    memoryCache.set(CACHE_KEYS.LAWYERS_ALL, lawyersWithVotes, CACHE_TTL.LAWYERS);
    console.log(` ${lawyersWithVotes.length} avocats mis en cache pour 60 minutes`);

    return lawyersWithVotes;
  }

  /**
   * Lit l'onglet BARREAU-DE-PARIS-2024 pour les données de vote
   */
  async readVoteData(): Promise<SheetVoteData[]> {
    try {
      console.log(' Lecture données de vote BARREAU-DE-PARIS-2024...');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'BARREAU-DE-PARIS-2024!A:K', // Colonnes A à K pour inclure le vote 2ème tour
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      // Ignorer la première ligne (entêtes) et traiter les données
      const voteData = rows.slice(1).map((row: any[]) => {
        return {
          prenomnom: row[5] || '', // Colonne F (index 5) - prenomnom pour matcher
          premier_tour_vote: !!(row[9] && row[9].trim() !== ''), // Colonne J (index 9) - 1er tour
          second_tour_vote: !!(row[10] && row[10].trim() !== ''), // Colonne K (index 10) - 2ème tour
        };
      }).filter((vote: any) => vote.prenomnom); // Filtrer les lignes sans prenomnom

      console.log(` ${voteData.length} entrées de vote récupérées`);
      return voteData;
    } catch (error) {
      console.error(' Erreur lecture données de vote:', error);
      return []; // Retourner un tableau vide en cas d'erreur
    }
  }

  /**
   * Lit l'onglet votes et retourne les données de participation
   * Note: Essaie plusieurs onglets possibles pour trouver les bonnes données
   */
  async readFirmsData(): Promise<SheetFirmData[]> {
    // 🚀 OPTIMISATION: Vérifier le cache en premier
    const cachedFirmsData = memoryCache.get<SheetFirmData[]>('firms_data');
    if (cachedFirmsData) {
      console.log(' Données cabinets chargées depuis le cache');
      return cachedFirmsData;
    }

    console.log(' Lecture données cabinets depuis Google Sheets...');
    // Essayer différents noms d'onglets possibles
    const possibleSheetNames = [
      'Synthèse vote toutes structures!A:I', // Onglet correct avec vraies données + colonne I (taille)
      'Synthèse vote par structure!A:I', // Fallback sur ancien onglet + colonne I
      // Ajouter d'autres noms possibles si nécessaire
    ];
    
    for (const rangeName of possibleSheetNames) {
      try {
        console.log(` Tentative lecture onglet: ${rangeName}`);
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: rangeName,
        });
        
        const rows = response.data.values || [];
        if (rows.length === 0) continue;
        
        console.log(` Trouvé ${rows.length} lignes dans ${rangeName}`);
        console.log(` Première ligne:`, rows[0]);
        console.log(` Deuxième ligne:`, rows[1]);
        
        const processedData = this.processFirmsData(rows);
        if (processedData.length > 0) {
          console.log(` ${processedData.length} cabinets valides trouvés`);
          // 🚀 OPTIMISATION: Mettre en cache pour 10 minutes
          memoryCache.set('firms_data', processedData, CACHE_TTL.STATS);
          return processedData;
        }
      } catch (error) {
        console.warn(` Impossible de lire ${rangeName}:`, error);
        continue;
      }
    }
    
    console.warn(' Aucun onglet de participation trouvé');
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
      const taille = (row[8] || '').toString().trim(); // Colonne I = index 8
      
      // Si le taux > 1, c'est probablement en pourcentage, le convertir en décimal
      if (taux > 1) {
        taux = taux / 100;
      }
      
      return {
        cabinet,
        taux_participation_moyen: taux,
        taille_cabinet: taille,
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
   * Met à jour le statut d'un avocat dans le Google Sheets
   * @param prenomnom Identifiant de l'avocat (prenomnom)
   * @param newStatus Nouveau statut (C1, C2, C3, Blacklist)
   */
  async updateLawyerStatus(prenomnom: string, newStatus: string): Promise<void> {
    try {
      // Lire toutes les données pour trouver l'avocat
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'Base principale!A:BU', // Toutes les colonnes
      });

      const rows = response.data.values || [];
      
      // Trouver la ligne de l'avocat (en cherchant dans la colonne prenomnom - index 1)
      let targetRowIndex = -1;
      for (let i = 1; i < rows.length; i++) { // Commencer à 1 pour ignorer l'en-tête
        const row = rows[i];
        if (row[1] === prenomnom) { // Colonne B = index 1 = prenomnom
          targetRowIndex = i + 1; // +1 car Google Sheets commence à 1, pas 0
          break;
        }
      }

      if (targetRowIndex === -1) {
        throw new Error(`Avocat avec prenomnom "${prenomnom}" non trouvé dans le Google Sheets`);
      }

      // Préparer les mises à jour
      const updates = [];
      
      // D'abord, effacer tous les anciens statuts (C1, C2, C3, Blacklist)
      const statusColumns = [
        { range: `Base principale!AS${targetRowIndex}`, value: '' }, // C1 - colonne 44 = AS
        { range: `Base principale!AT${targetRowIndex}`, value: '' }, // C2 - colonne 45 = AT  
        { range: `Base principale!AU${targetRowIndex}`, value: '' }, // C3 - colonne 46 = AU
        { range: `Base principale!AX${targetRowIndex}`, value: '' }, // Blacklist - colonne 49 = AX
      ];

      // Puis définir le nouveau statut
      switch (newStatus) {
        case 'C1':
          statusColumns[0].value = '1'; // Mettre 1 dans la colonne C1
          break;
        case 'C2':
          statusColumns[1].value = '1'; // Mettre 1 dans la colonne C2
          break;
        case 'C3':
          statusColumns[2].value = '1'; // Mettre 1 dans la colonne C3
          break;
        case 'Blacklist':
          statusColumns[3].value = '1'; // Mettre 1 dans la colonne Blacklist
          break;
        default:
          // Pour "Non classifié", on laisse tout vide (déjà fait ci-dessus)
          break;
      }

      // Mettre à jour aussi la colonne "classement agrégé" (colonne 47 = AV)
      statusColumns.push({
        range: `Base principale!AV${targetRowIndex}`,
        value: newStatus === 'Non classifié' ? '' : newStatus
      });

      // Exécuter toutes les mises à jour en batch
      const batchUpdateData = statusColumns.map(update => ({
        range: update.range,
        values: [[update.value]]
      }));

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: batchUpdateData
        }
      });

      console.log(` Google Sheets mis à jour: ${prenomnom}  ${newStatus} (ligne ${targetRowIndex})`);

      // Invalider le cache pour forcer le rechargement des données sur toutes les pages
      memoryCache.delete(CACHE_KEYS.LAWYERS_ALL);
      console.log(` Cache invalidé: les données seront rechargées depuis Google Sheets`);

    } catch (error) {
      console.error(' Erreur lors de la mise à jour du statut dans Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Test de connexion - lit les 10 premières lignes de l'onglet principal
   */
  async testConnection(): Promise<any[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: await this.getSourceRange('A1:CZ10'), // onglet résolu par gid (test connexion)
    });

    return response.data.values || [];
  }
}

export const googleSheets = new GoogleSheetsService();