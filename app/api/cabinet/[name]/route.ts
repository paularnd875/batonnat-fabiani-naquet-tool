import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { googleSheets } from '@/lib/google-sheets';

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    
    // Paramètres de pagination depuis l'URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Récupérer TOUS les avocats du Google Sheet avec leurs photos
    console.log('🔍 Récupération avocats Google Sheet avec photos...');
    const allLawyersFromSheet = await googleSheets.readLawyers();
    
    // Filtrer par cabinet
    let filteredLawyers;
    if (cabinetName === 'Individuel') {
      // Pour "Individuel", chercher les cabinets vides ou null
      filteredLawyers = allLawyersFromSheet.filter(lawyer => 
        !lawyer.cabinet || lawyer.cabinet.trim() === ''
      );
    } else {
      filteredLawyers = allLawyersFromSheet.filter(lawyer => 
        lawyer.cabinet === cabinetName
      );
    }

    // Calculer les totaux et trier : soutiens publics et classés en premier
    const totalLawyers = filteredLawyers.length;
    
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

    console.log(`📊 Cabinet ${cabinetName}: ${lawyersWithAssignments.length} avocats avec photos`);

    // Calculer les stats VRAIES du cabinet directement depuis les données Google Sheets
    const realStats = {
      name: cabinetName,
      lawyer_count: filteredLawyers.length,
      c1_count: 0,
      c2_count: 0,
      c3_count: 0,
      bl_count: 0,
      soutien_public_count: 0,
      unclassified_count: 0,
      assigned_count: 0
    };

    // Calculer les vraies statistiques
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

    // Calculer les assignations pour ce cabinet
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

    realStats.participation_rate = realStats.lawyer_count > 0 ? realStats.assigned_count / realStats.lawyer_count : 0;

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