/**
 * Service unifié pour la fusion des données Google Sheets + SQLite + localStorage
 * Garantit la cohérence entre toutes les APIs
 */

import { googleSheets } from '@/lib/google-sheets';
import { getDatabase } from '@/lib/database';

export interface UnifiedLawyer {
  prenomnom: string;
  nom: string;
  prenom: string;
  cabinet: string;
  classement: string;
  soutien_public: boolean;
  premier_tour_vote?: boolean;
  second_tour_vote?: boolean;
  photo_url?: string;
  email?: string;
  telephone?: string;
  [key: string]: any;
}

export class UnifiedDataService {
  private static instance: UnifiedDataService;
  private cachedLawyers: UnifiedLawyer[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService();
    }
    return UnifiedDataService.instance;
  }

  /**
   * Récupère tous les avocats avec fusion complète SQLite + localStorage
   * Méthode centralisée utilisée par toutes les APIs
   */
  async getAllLawyersWithStatuses(forceRefresh = false): Promise<UnifiedLawyer[]> {
    const now = Date.now();
    
    // Utiliser le cache si disponible et récent
    if (!forceRefresh && this.cachedLawyers && (now - this.lastCacheTime) < this.CACHE_DURATION) {
      console.log(' Données unifiées chargées depuis le cache interne');
      return this.cachedLawyers;
    }

    console.log(' Fusion unifiée des données : Google Sheets + SQLite + localStorage');
    const startTime = Date.now();

    // 1. Charger Google Sheets
    const allLawyersFromSheet = await googleSheets.readLawyers();
    console.log(` ${allLawyersFromSheet.length} avocats lus depuis Google Sheets`);

    // 2. Charger SQLite
    const db = getDatabase();
    const latestStatuses = await db.getAllLatestStatuses();
    console.log(` ${latestStatuses.size} statuts trouvés en SQLite`);
    
    // 3. Fusionner avec SQLite
    let unifiedLawyers = allLawyersFromSheet.map(lawyer => {
      const updatedStatus = latestStatuses.get(lawyer.prenomnom);
      if (updatedStatus !== undefined) {
        return {
          ...lawyer,
          classement: updatedStatus
        };
      }
      return lawyer;
    });
    
    // 4. Fusionner avec localStorage (côté serveur, impossible - sera fait côté client)
    // Note: Le localStorage ne peut pas être lu côté serveur
    // Cette fusion se fait côté client via l'API /api/lawyers-with-localstorage
    
    const duration = Date.now() - startTime;
    console.log(` Fusion unifiée terminée en ${duration}ms - ${unifiedLawyers.length} avocats`);

    // Mettre en cache
    this.cachedLawyers = unifiedLawyers as any;
    this.lastCacheTime = now;

    return unifiedLawyers as any;
  }

  /**
   * Calcule les statistiques par cabinet de manière unifiée
   */
  async getCabinetStatistics(forceRefresh = false): Promise<Map<string, any>> {
    const allLawyers = await this.getAllLawyersWithStatuses(forceRefresh);
    
    console.log(' Calcul des statistiques cabinets unifiées...');
    const cabinetStats = new Map();
    
    allLawyers.forEach((lawyer: any) => {
      const cabinet = lawyer.cabinet || 'Individuel';
      const displayName = cabinet === 'Individuel' ? 'Avocats en individuel' : cabinet;
      
      if (!cabinetStats.has(cabinet)) {
        cabinetStats.set(cabinet, {
          name: displayName,
          lawyer_count: 0,
          c1_count: 0,
          c2_count: 0,
          c3_count: 0,
          bl_count: 0,
          soutien_public_count: 0,
          unclassified_count: 0,
          assigned_count: 0,
          vote_count: 0,
          participation_rate: 0
        });
      }

      const stats = cabinetStats.get(cabinet);
      stats.lawyer_count++;
      
      // Compter les votes pour la participation
      if (lawyer.premier_tour_vote || lawyer.second_tour_vote) {
        stats.vote_count++;
      }
      
      if (lawyer.soutien_public) stats.soutien_public_count++;
      
      switch (lawyer.classement) {
        case 'C1': stats.c1_count++; break;
        case 'C2': stats.c2_count++; break;
        case 'C3': stats.c3_count++; break;
        case 'Blacklist': stats.bl_count++; break;
        default: stats.unclassified_count++; break;
      }
    });

    // Calculer les taux de participation
    cabinetStats.forEach((stats, cabinet) => {
      stats.participation_rate = stats.lawyer_count > 0 ? stats.vote_count / stats.lawyer_count : 0;
    });

    console.log(` ${cabinetStats.size} cabinets calculés avec statistiques unifiées`);
    return cabinetStats;
  }

  /**
   * Filtre les avocats par cabinet de manière unifiée
   */
  async getLawyersByCabinet(cabinetName: string, forceRefresh = false): Promise<UnifiedLawyer[]> {
    const allLawyers = await this.getAllLawyersWithStatuses(forceRefresh);
    
    let normalizedCabinetName = cabinetName;
    if (cabinetName === 'Avocats en individuel') {
      normalizedCabinetName = 'Individuel';
    }

    let filteredLawyers;
    if (normalizedCabinetName === 'Individuel') {
      filteredLawyers = allLawyers.filter((lawyer: any) => 
        !lawyer.cabinet || lawyer.cabinet.trim() === ''
      );
    } else {
      filteredLawyers = allLawyers.filter((lawyer: any) => 
        lawyer.cabinet === normalizedCabinetName
      );
    }

    return filteredLawyers;
  }

  /**
   * Invalide le cache pour forcer une actualisation
   */
  invalidateCache(): void {
    this.cachedLawyers = null;
    this.lastCacheTime = 0;
    console.log(' Cache unifié invalidé');
  }

  /**
   * Debug: Affiche quelques avocats avec leurs statuts pour vérifier la fusion
   */
  async debugStatuses(cabinetName: string = 'Individuel'): Promise<void> {
    console.log(` DEBUG: Vérification des statuts pour cabinet "${cabinetName}"`);
    
    const allLawyers = await this.getAllLawyersWithStatuses(false);
    const filteredLawyers = allLawyers
      .filter((lawyer: any) => {
        if (cabinetName === 'Individuel') {
          return !lawyer.cabinet || lawyer.cabinet.trim() === '';
        }
        return lawyer.cabinet === cabinetName;
      })
      .slice(0, 10); // Premiers 10 pour debug
    
    console.log(` Échantillon ${cabinetName}:`);
    filteredLawyers.forEach((lawyer: any, index: number) => {
      console.log(`  ${index + 1}. ${lawyer.nom_complet || lawyer.prenomnom}: Statut="${lawyer.classement}", SP=${lawyer.soutien_public ? 'Oui' : 'Non'}`);
    });
    
    const stats = {
      total: filteredLawyers.length,
      c1: filteredLawyers.filter(l => l.classement === 'C1').length,
      c2: filteredLawyers.filter(l => l.classement === 'C2').length,
      c3: filteredLawyers.filter(l => l.classement === 'C3').length,
      sp: filteredLawyers.filter(l => l.soutien_public).length,
      bl: filteredLawyers.filter(l => l.classement === 'Blacklist').length,
    };
    
    console.log(` Stats échantillon: C1=${stats.c1}, C2=${stats.c2}, C3=${stats.c3}, SP=${stats.sp}, BL=${stats.bl}`);
  }
}

// Export singleton
export const unifiedData = UnifiedDataService.getInstance();