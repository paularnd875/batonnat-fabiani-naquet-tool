import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { unifiedData } from '@/lib/unified-data';

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
    const exercice = searchParams.get('exercice') || 'all'; // 'all', 'Individuel', 'Collaborateur', 'Associé', 'SCP'
    const taille = searchParams.get('taille') || 'all'; // 'all', '0', '1', '2-5', '5-25', '25-50', '50&+', 'Non trouvé'
    
    // Si aucune recherche textuelle mais un filtre, on autorise la recherche
    if ((!query || query.length < 2) && classification === 'all' && exercice === 'all' && taille === 'all') {
      return NextResponse.json({
        success: false,
        error: 'Requête de recherche trop courte (minimum 2 caractères) ou sélectionnez un filtre'
      }, { status: 400 });
    }

    console.log(` Recherche: "${query}" (type: ${type}, classification: ${classification}, exercice: ${exercice}, taille: ${taille}, limit: ${limit})`);
    const startTime = Date.now();

    // 🚀 OPTIMISATION: Récupérer les données depuis le cache ou Google Sheets
    const loadStartTime = Date.now();
    const cachedLawyers = memoryCache.get(CACHE_KEYS.LAWYERS_ALL);
    const allLawyers = await googleSheets.readLawyers();
    const loadTime = Date.now() - loadStartTime;
    const isCached = loadTime < 100; // Si très rapide, c'est du cache
    
    console.log(` ${allLawyers.length} avocats chargés pour recherche (${isCached ? 'CACHE ' : 'GOOGLE_SHEETS '} - ${loadTime}ms)`);
    
    // 🚨 ALERTE PERFORMANCE: Si le chargement est très lent, suggérer le réchauffage
    if (!isCached && loadTime > 5000) {
      console.warn(` PERFORMANCE CRITIQUE: ${loadTime}ms pour charger les données!`);
      console.warn(` SOLUTION: Le système de pré-chargement intelligent devrait éviter cela`);
    }

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

        // Filtre de mode d'exercice
        let matchesExercice = true;
        if (exercice !== 'all') {
          matchesExercice = lawyer.statut_cabinet === exercice;
        }

        // Filtre de taille de cabinet (temporaire : basé sur le nom du cabinet pour tester)
        let matchesTaille = true;
        if (taille !== 'all') {
          // TODO: Remplacer par les vraies données de taille quand disponibles
          // Pour l'instant, simuler avec quelques règles simples
          if (taille === '0') {
            matchesTaille = false; // Pas de cabinet avec 0 avocats logiquement
          } else if (taille === '1') {
            matchesTaille = lawyer.cabinet === 'Individuel' || !lawyer.cabinet;
          } else if (taille === 'Non trouvé') {
            matchesTaille = !lawyer.taille_cabinet; // Si pas de données de taille
          }
          // Pour les autres tailles, on autorise tout pour l'instant
        }
        
        return matchesText && matchesClassification && matchesExercice && matchesTaille;
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
            individuel_count: 0, collaborateur_count: 0, associe_count: 0, scp_count: 0,
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
        
        // Comptage des modes d'exercice
        switch (lawyer.statut_cabinet) {
          case 'Individuel': cabinet.individuel_count++; break;
          case 'Collaborateur': cabinet.collaborateur_count++; break;
          case 'Associé': cabinet.associe_count++; break;
          case 'SCP': cabinet.scp_count++; break;
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

          // Filtre de mode d'exercice
          let matchesExercice = true;
          if (exercice !== 'all') {
            if (exercice === 'Individuel') {
              matchesExercice = cabinet.individuel_count > 0;
            } else if (exercice === 'Collaborateur') {
              matchesExercice = cabinet.collaborateur_count > 0;
            } else if (exercice === 'Associé') {
              matchesExercice = cabinet.associe_count > 0;
            } else if (exercice === 'SCP') {
              matchesExercice = cabinet.scp_count > 0;
            }
          }

          // Filtre de taille de cabinet (temporaire : basé sur le nombre d'avocats)
          let matchesTaille = true;
          if (taille !== 'all') {
            // TODO: Remplacer par les vraies données de taille quand disponibles
            // Pour l'instant, simuler avec des règles basées sur le nombre d'avocats
            if (taille === '0') {
              matchesTaille = cabinet.lawyer_count === 0;
            } else if (taille === '1') {
              matchesTaille = cabinet.lawyer_count === 1;
            } else if (taille === '2-5') {
              matchesTaille = cabinet.lawyer_count >= 2 && cabinet.lawyer_count <= 5;
            } else if (taille === '5-25') {
              matchesTaille = cabinet.lawyer_count > 5 && cabinet.lawyer_count <= 25;
            } else if (taille === '25-50') {
              matchesTaille = cabinet.lawyer_count > 25 && cabinet.lawyer_count <= 50;
            } else if (taille === '50&+') {
              matchesTaille = cabinet.lawyer_count > 50;
            } else if (taille === 'Non trouvé') {
              matchesTaille = !cabinet.taille_cabinet; // Si pas de données de taille
            }
          }
          
          return matchesText && matchesClassification && matchesExercice && matchesTaille;
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

    console.log(` Recherche "${query}" (${classification}) terminée: ${results.totalFound} résultats en ${results.searchTime}ms`);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error(' Erreur recherche:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de recherche'
    }, { status: 500 });
  }
}