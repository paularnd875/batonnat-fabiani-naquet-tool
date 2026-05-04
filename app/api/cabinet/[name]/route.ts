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

    // Calculer les totaux (le tri sera fait côté frontend)
    const totalLawyers = filteredLawyers.length;
    
    // Appliquer la pagination
    const paginatedLawyers = filteredLawyers.slice(offset, offset + limit);
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

    // Récupérer les stats du cabinet
    const { data: firmStats, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('name', cabinetName)
      .single();

    if (firmError) console.error('Erreur stats cabinet:', firmError);

    return NextResponse.json({
      success: true,
      cabinet: {
        name: cabinetName,
        lawyers: lawyersWithAssignments || [],
        stats: firmStats,
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