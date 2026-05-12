import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

/**
 * API de recherche universelle - Recherche dans cabinets ET avocats
 * Support recherche par nom, cabinet, spécialisation, etc.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type') || 'all'; // 'lawyers', 'cabinets', 'all'
    const classification = searchParams.get('classification') || 'all'; // 'all', 'C1', 'C2', 'C3', 'BL', 'SP'
    
    // Si aucune recherche textuelle mais un filtre de classification, on autorise la recherche
    if ((!query || query.length < 2) && classification === 'all') {
      return NextResponse.json({
        success: false,
        error: 'Requête de recherche trop courte (minimum 2 caractères) ou sélectionnez un filtre'
      }, { status: 400 });
    }

    console.log(`🔍 Recherche: "${query}" (type: ${type}, classification: ${classification}, limit: ${limit})`);
    const startTime = Date.now();

    // Récupérer les données depuis le cache ou Google Sheets
    const allLawyers = await googleSheets.readLawyers();
    console.log(`📋 ${allLawyers.length} avocats chargés pour recherche`);

    const queryLower = query ? query.toLowerCase() : '';
    const results: {
      lawyers: any[];
      cabinets: any[];
      query: string | null | undefined;
      totalFound: number;
      searchTime: number;
      totalLawyersFound?: number;
      totalCabinetsFound?: number;
    } = {
      lawyers: [],
      cabinets: [],
      query,
      totalFound: 0,
      searchTime: 0
    };

    // 1. RECHERCHE DANS LES AVOCATS
    if (type === 'all' || type === 'lawyers') {
      const foundLawyers = allLawyers.filter((lawyer: any) => {
        // Filtre textuel
        const searchFields = [
          lawyer.nom_complet || '',
          lawyer.prenomnom || '',
          lawyer.civilite || '',
          lawyer.specialisations?.join(' ') || '',
          lawyer.cabinet || '',
          lawyer.email || '',
          lawyer.classement || ''
        ].join(' ').toLowerCase();
        
        const matchesText = !query || searchFields.includes(queryLower);
        
        // Filtre de classification
        let matchesClassification = true;
        if (classification !== 'all') {
          if (classification === 'SP') {
            matchesClassification = lawyer.soutien_public === true;
          } else if (classification === 'BL') {
            matchesClassification = lawyer.classement === 'Blacklist';
          } else {
            matchesClassification = lawyer.classement === classification;
          }
        }
        
        return matchesText && matchesClassification;
      });

      // Trier par pertinence (nom d'abord, puis cabinet)
      const sortedLawyers = foundLawyers.sort((a, b) => {
        const aName = (a.nom_complet || a.prenomnom || '').toLowerCase();
        const bName = (b.nom_complet || b.prenomnom || '').toLowerCase();
        
        // Correspondance exacte du nom en premier
        if (aName.includes(queryLower) && !bName.includes(queryLower)) return -1;
        if (!aName.includes(queryLower) && bName.includes(queryLower)) return 1;
        
        // Puis alphabétique
        return aName.localeCompare(bName);
      });

      // Garder le nombre total trouvé avant de limiter
      const totalLawyersFound = sortedLawyers.length;
      
      results.lawyers = sortedLawyers.slice(0, limit).map((lawyer: any) => ({
        prenomnom: lawyer.prenomnom,
        nom_complet: lawyer.nom_complet,
        civilite: lawyer.civilite,
        cabinet: lawyer.cabinet || 'Individuel',
        email: lawyer.email,
        photo_url: lawyer.photo_url,
        specialisations: lawyer.specialisations,
        classement: lawyer.classement,
        soutien_public: lawyer.soutien_public,
        statut_cabinet: lawyer.statut_cabinet
      }));
      
      // Ajouter l'info du total trouvé pour les avocats
      results.totalLawyersFound = totalLawyersFound;
    }

    // 2. RECHERCHE DANS LES CABINETS
    if (type === 'all' || type === 'cabinets') {
      // Créer une map des cabinets avec leurs statistiques
      const cabinetsMap = new Map();
      
      allLawyers.forEach((lawyer: any) => {
        const cabinetName = lawyer.cabinet || 'Individuel';
        const displayName = cabinetName === 'Individuel' ? 'Avocats en individuel' : cabinetName;
        
        if (!cabinetsMap.has(cabinetName)) {
          cabinetsMap.set(cabinetName, {
            name: displayName,
            originalName: cabinetName,
            lawyer_count: 0,
            c1_count: 0, c2_count: 0, c3_count: 0, bl_count: 0,
            soutien_public_count: 0,
            sample_lawyers: []
          });
        }
        
        const cabinet = cabinetsMap.get(cabinetName);
        cabinet.lawyer_count++;
        
        if (lawyer.soutien_public) cabinet.soutien_public_count++;
        switch (lawyer.classement) {
          case 'C1': cabinet.c1_count++; break;
          case 'C2': cabinet.c2_count++; break;
          case 'C3': cabinet.c3_count++; break;
          case 'Blacklist': cabinet.bl_count++; break;
        }
        
        // Garder quelques exemples d'avocats
        if (cabinet.sample_lawyers.length < 3) {
          cabinet.sample_lawyers.push({
            nom_complet: lawyer.nom_complet,
            prenomnom: lawyer.prenomnom
          });
        }
      });

      // Filtrer les cabinets correspondant à la recherche
      const foundCabinets = Array.from(cabinetsMap.values())
        .filter((cabinet: any) => {
          // Filtre textuel
          const matchesText = !query || cabinet.name.toLowerCase().includes(queryLower);
          
          // Filtre de classification
          let matchesClassification = true;
          if (classification !== 'all') {
            if (classification === 'SP') {
              matchesClassification = cabinet.soutien_public_count > 0;
            } else if (classification === 'C1') {
              matchesClassification = cabinet.c1_count > 0;
            } else if (classification === 'C2') {
              matchesClassification = cabinet.c2_count > 0;
            } else if (classification === 'C3') {
              matchesClassification = cabinet.c3_count > 0;
            } else if (classification === 'BL') {
              matchesClassification = cabinet.bl_count > 0;
            }
          }
          
          return matchesText && matchesClassification;
        })
        .sort((a: any, b: any) => {
          // Cabinets avec correspondance exacte en premier
          const aExact = a.name.toLowerCase().startsWith(queryLower);
          const bExact = b.name.toLowerCase().startsWith(queryLower);
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Puis par taille (plus gros d'abord)
          return b.lawyer_count - a.lawyer_count;
        });

      // Garder le nombre total trouvé avant de limiter
      const totalCabinetsFound = foundCabinets.length;
      
      results.cabinets = foundCabinets.slice(0, limit);
      results.totalCabinetsFound = totalCabinetsFound;
    }

    results.totalFound = results.lawyers.length + results.cabinets.length;
    results.searchTime = Date.now() - startTime;

    console.log(`🔍 Recherche "${query}" (${classification}) terminée: ${results.totalFound} résultats en ${results.searchTime}ms`);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de recherche'
    }, { status: 500 });
  }
}