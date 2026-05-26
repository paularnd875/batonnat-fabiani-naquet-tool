import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { googleSheets } from '@/lib/google-sheets';
import { getDatabase } from '@/lib/database';

/**
 * Version optimisée de l'API cabinet avec pagination intelligente
 * Évite de charger tous les avocats pour de gros cabinets
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Limiter à 100 max
    
    // OPTIMISATION 1: Cache spécialisé par cabinet
    const cacheKey = `cabinet_stats_${cabinetName}`;
    
    // OPTIMISATION 2: Pour les gros cabinets, utiliser une approche différente
    let normalizedCabinetName = cabinetName;
    if (cabinetName === 'Avocats en individuel') {
      normalizedCabinetName = 'Individuel';
      
      // Pour les avocats individuels (13K+), utiliser l'API firms-live directement
      const firmsResponse = await fetch(`${request.url.split('/cabinet/')[0]}/api/firms-live`);
      const firmsData = await firmsResponse.json();
      
      if (firmsData.success) {
        const individualFirm = firmsData.firms.find((f: any) => f.name === 'Avocats en individuel');
        if (individualFirm) {
          // Retourner les stats sans charger tous les avocats
          return NextResponse.json({
            success: true,
            cabinet: {
              name: cabinetName,
              lawyers: [], // Vide pour éviter le timeout
              stats: {
                ...individualFirm,
                name: cabinetName
              },
              count: 0,
              totalLawyers: individualFirm.lawyer_count,
              pagination: {
                currentPage: page,
                totalPages: Math.ceil(individualFirm.lawyer_count / limit),
                limit,
                offset: (page - 1) * limit,
                hasNext: page < Math.ceil(individualFirm.lawyer_count / limit),
                hasPrev: page > 1,
                warning: 'Pagination désactivée pour les gros cabinets (performances)'
              }
            }
          });
        }
      }
    }

    // Pour les autres cabinets, utiliser l'approche normale mais optimisée
    console.log(`🚀 API Optimisée - Cabinet: ${cabinetName} (page ${page}, limit ${limit})`);
    
    const startTime = Date.now();
    const allLawyersFromSheet = await googleSheets.readLawyers();
    console.log(`⚡ Google Sheets lu en ${Date.now() - startTime}ms`);

    // Fusionner avec les statuts de la base SQLite (même logique que /api/lawyers)
    console.log('🔄 Fusion avec les statuts SQLite...');
    const db = getDatabase();
    const latestStatuses = await db.getAllLatestStatuses();
    console.log(`📋 ${latestStatuses.size} statuts trouvés en base SQLite`);
    
    // Mettre à jour les statuts des avocats avec ceux de la base SQLite
    const lawyersWithUpdatedStatuses = allLawyersFromSheet.map(lawyer => {
      const updatedStatus = latestStatuses.get(lawyer.prenomnom);
      if (updatedStatus !== undefined) {
        return {
          ...lawyer,
          classement: updatedStatus
        };
      }
      return lawyer;
    });
    
    console.log(`✅ Fusion terminée - ${lawyersWithUpdatedStatuses.length} avocats avec statuts à jour`);

    // Filtrage optimisé (utiliser données fusionnées)
    let filteredLawyers;
    if (normalizedCabinetName === 'Individuel') {
      filteredLawyers = lawyersWithUpdatedStatuses.filter((lawyer: any) => 
        !lawyer.cabinet || lawyer.cabinet.trim() === ''
      );
    } else {
      filteredLawyers = lawyersWithUpdatedStatuses.filter((lawyer: any) => 
        lawyer.cabinet === normalizedCabinetName
      );
    }

    const totalLawyers = filteredLawyers.length;
    
    // OPTIMISATION 3: Tri et pagination côté serveur
    const sortedLawyers = filteredLawyers.sort((a, b) => {
      if (a.soutien_public && !b.soutien_public) return -1;
      if (!a.soutien_public && b.soutien_public) return 1;
      return (a.nom_complet || a.prenomnom || '').localeCompare(b.nom_complet || b.prenomnom || '');
    });
    
    const offset = (page - 1) * limit;
    const paginatedLawyers = sortedLawyers.slice(offset, offset + limit);
    
    // OPTIMISATION 4: Assignations seulement pour la page courante
    const { data: assignments } = await supabase
      .from('assignments')
      .select('lawyer_prenomnom');

    const assignedLawyersSet = new Set(assignments?.map((a: any) => a.lawyer_prenomnom) || []);
    
    const lawyersWithAssignments = paginatedLawyers.map(lawyer => ({
      ...lawyer,
      assignments: assignedLawyersSet.has(lawyer.prenomnom) ? ['assigned'] : []
    }));

    // Stats calculées de façon optimisée
    const stats = {
      name: cabinetName,
      lawyer_count: totalLawyers,
      c1_count: 0, c2_count: 0, c3_count: 0, bl_count: 0,
      soutien_public_count: 0, unclassified_count: 0,
      assigned_count: 0, participation_rate: 0
    };

    // Calcul rapide des stats
    let voteCount = 0;
    filteredLawyers.forEach((lawyer: any) => {
      if (lawyer.soutien_public) stats.soutien_public_count++;
      if (lawyer.premier_tour_vote || lawyer.second_tour_vote) voteCount++;
      
      switch (lawyer.classement) {
        case 'C1': stats.c1_count++; break;
        case 'C2': stats.c2_count++; break;
        case 'C3': stats.c3_count++; break;
        case 'Blacklist': stats.bl_count++; break;
        default: stats.unclassified_count++; break;
      }
      
      if (assignedLawyersSet.has(lawyer.prenomnom)) stats.assigned_count++;
    });
    
    stats.participation_rate = totalLawyers > 0 ? voteCount / totalLawyers : 0;

    const totalPages = Math.ceil(totalLawyers / limit);
    
    console.log(`⚡ API Optimisée terminée en ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      cabinet: {
        name: cabinetName,
        lawyers: lawyersWithAssignments,
        stats,
        count: lawyersWithAssignments.length,
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
    console.error('❌ Erreur API cabinet optimisée:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}