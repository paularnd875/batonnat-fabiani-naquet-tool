import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { googleSheets } from '@/lib/google-sheets';
import { getDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    
    // Paramètres de pagination depuis l'URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    
    // 🚀 OPTIMISATION CRITIQUE: Limiter drastiquement pour éviter les timeouts de 3+ minutes
    const limit = Math.min(requestedLimit, 100); // Maximum 100 par page
    const offset = (page - 1) * limit;
    
    console.log(` API Cabinet: ${cabinetName} (limit: ${requestedLimit}  ${limit}, page: ${page})`);
    
    // 🛡️ PROTECTION CRITIQUE: Détecter les gros cabinets qui causent des timeouts 
    let normalizedCabinetName = cabinetName;
    if (cabinetName === 'Avocats en individuel') {
      normalizedCabinetName = 'Individuel';
      
      // 🚨 ÉVITEMENT DE TIMEOUT: Pour les 13K+ avocats individuels, utiliser l'API optimisée
      console.log(' GROS CABINET DÉTECTÉ (13K+ avocats): Redirection vers API optimisée');
      try {
        const baseUrl = request.url.split('/api/cabinet/')[0];
        const optimizedUrl = `${baseUrl}/api/cabinet/${encodeURIComponent(cabinetName)}/optimized?${searchParams.toString()}`;
        
        const optimizedResponse = await fetch(optimizedUrl);
        if (optimizedResponse.ok) {
          const optimizedData = await optimizedResponse.json();
          return NextResponse.json(optimizedData);
        }
      } catch (error) {
        console.warn(' Redirection API optimisée échouée, continuation avec API normale (limitée)');
      }
    }
    
    // 🚀 UTILISER LE SERVICE UNIFIÉ pour garantir la cohérence avec dashboard
    console.log(' Récupération avocats avec service unifié...');
    const startTime = Date.now();
    const { unifiedData } = await import('@/lib/unified-data');
    
    // Invalider le cache pour forcer une actualisation
    unifiedData.invalidateCache();
    
    // Récupérer les avocats filtrés par cabinet avec toutes les fusions appliquées
    const filteredLawyers = await unifiedData.getLawyersByCabinet(cabinetName, true); // Force refresh
    console.log(` Données unifiées récupérées en ${Date.now() - startTime}ms`);
    
    console.log(` Cabinet "${cabinetName}": ${filteredLawyers.length} avocats trouvés`);
    
    // Debug des statuts pour voir ce qui se passe
    await unifiedData.debugStatuses(normalizedCabinetName);

    // 🛡️ PROTECTION GÉNÉRALE: Détecter automatiquement les gros cabinets (>1000 avocats)
    const totalLawyers = filteredLawyers.length;
    const isLargeFirm = totalLawyers > 1000;
    
    if (isLargeFirm && requestedLimit > 50) {
      console.log(` GROS CABINET AUTO-DÉTECTÉ: ${cabinetName} (${totalLawyers} avocats) - Limite forcée à 50`);
      // Pour les gros cabinets, forcer une limite encore plus stricte
      const safeLimitForLargeFirms = Math.min(limit, 50);
      const safePaginatedLawyers = filteredLawyers.slice(offset, offset + safeLimitForLargeFirms);
      
      return NextResponse.json({
        success: true,
        cabinet: {
          name: cabinetName,
          lawyers: safePaginatedLawyers,
          stats: {
            name: cabinetName,
            lawyer_count: totalLawyers,
            message: `Cabinet volumineux (${totalLawyers} avocats) - Pagination limitée pour performance`
          },
          count: safePaginatedLawyers.length,
          totalLawyers,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalLawyers / safeLimitForLargeFirms),
            limit: safeLimitForLargeFirms,
            offset,
            hasNext: page < Math.ceil(totalLawyers / safeLimitForLargeFirms),
            hasPrev: page > 1,
            warning: 'Pagination réduite pour ce cabinet volumineux'
          }
        }
      });
    }

    // Calculer les totaux et trier : soutiens publics et classés en premier
    
    // Trier les avocats : soutien_public > Blacklist > C1 > C2 > C3 > non classés
    const sortOrder: { [key: string]: number } = {
      'soutien_public': 0,  // Priorité maximale pour soutien public
      'Blacklist': 1,
      'C1': 2,
      'C2': 3, 
      'C3': 4,
      '': 5,           // Non classés en dernier
      'null': 5,
      'undefined': 5
    };
    
    const sortedLawyers = filteredLawyers.sort((a, b) => {
      // D'abord trier par soutien public (true en premier)
      if (a.soutien_public && !b.soutien_public) return -1;
      if (!a.soutien_public && b.soutien_public) return 1;
      
      // Puis par classement
      const orderA = sortOrder[a.classement || ''] ?? 5;
      const orderB = sortOrder[b.classement || ''] ?? 5;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // En cas d'égalité, trier alphabétiquement
      return (a.nom_complet || a.prenomnom || '').localeCompare(b.nom_complet || b.prenomnom || '');
    });
    
    // Appliquer la pagination sur les données triées
    const paginatedLawyers = sortedLawyers.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalLawyers / limit);

    // Récupérer les assignations depuis Supabase pour chaque avocat (seulement pour la page courante)
    const lawyersWithAssignments = await Promise.all(
      paginatedLawyers.map(async (lawyer) => {
        // Récupérer les assignations pour cet avocat via prenomnom
        const { data: assignments, error: assignError } = await supabase
          .from('assignments')
          .select(`
            id,
            team_member_id,
            assigned_at,
            team_members (
              id,
              prenom,
              nom,
              email
            )
          `)
          .eq('lawyer_prenomnom', lawyer.prenomnom);

        if (assignError) console.error('Erreur assignations:', assignError);

        return {
          ...lawyer,
          assignments: assignments || []
        };
      })
    );

    console.log(` Cabinet ${cabinetName}: ${lawyersWithAssignments.length} avocats avec photos`);

    // 🚀 UTILISER LE SERVICE UNIFIÉ pour les statistiques aussi
    const allCabinetStats = await unifiedData.getCabinetStatistics(false);
    
    // Trouver les stats pour ce cabinet spécifique
    let realStats: any;
    const normalizedForStats = cabinetName === 'Avocats en individuel' ? 'Individuel' : cabinetName;
    
    if (allCabinetStats.has(normalizedForStats)) {
      realStats = { ...allCabinetStats.get(normalizedForStats) };
      realStats.name = cabinetName; // Garder le nom d'affichage
      realStats.lawyer_count = filteredLawyers.length;
      
      console.log(` STATS TROUVÉES pour ${normalizedForStats}:`, {
        c1: realStats.c1_count,
        c2: realStats.c2_count,
        c3: realStats.c3_count,
        sp: realStats.soutien_public_count,
        bl: realStats.bl_count,
        total: realStats.lawyer_count
      });
    } else {
      // Fallback au calcul manuel si pas trouvé
      realStats = {
        name: cabinetName,
        lawyer_count: filteredLawyers.length,
        c1_count: 0,
        c2_count: 0,
        c3_count: 0,
        bl_count: 0,
        soutien_public_count: 0,
        unclassified_count: 0,
        assigned_count: 0,
        participation_rate: 0
      };

      // Calculer depuis les données filtrées
      filteredLawyers.forEach((lawyer: any) => {
        if (lawyer.soutien_public) realStats.soutien_public_count++;
        
        switch (lawyer.classement) {
          case 'C1': realStats.c1_count++; break;
          case 'C2': realStats.c2_count++; break;
          case 'C3': realStats.c3_count++; break;
          case 'Blacklist': realStats.bl_count++; break;
          default: realStats.unclassified_count++; break;
        }
      });
    }

    // Calculer les assignations pour ce cabinet (pour l'interface admin)
    const { data: assignments } = await supabase
      .from('assignments')
      .select('lawyer_prenomnom');
    
    if (assignments) {
      const assignedLawyersSet = new Set(assignments.map((a: any) => a.lawyer_prenomnom));
      filteredLawyers.forEach((lawyer: any) => {
        if (assignedLawyersSet.has(lawyer.prenomnom)) {
          realStats.assigned_count++;
        }
      });
    }

    // CORRECTION: Calculer le vrai taux de participation depuis les données de vote Google Sheets
    let voteCount = 0;
    filteredLawyers.forEach((lawyer: any) => {
      // Compter les avocats qui ont voté au moins à un tour
      if (lawyer.premier_tour_vote || lawyer.second_tour_vote) {
        voteCount++;
      }
    });
    
    realStats.participation_rate = realStats.lawyer_count > 0 ? voteCount / realStats.lawyer_count : 0;

    return NextResponse.json({
      success: true,
      cabinet: {
        name: cabinetName,
        lawyers: lawyersWithAssignments || [],
        stats: realStats, // Utilise les vraies statistiques calculées
        count: lawyersWithAssignments?.length || 0,
        totalLawyers,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          offset,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération cabinet:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}