import { NextRequest, NextResponse } from 'next/server';
import { googleSheets, SheetLawyer } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';

interface LawyersApiResponse {
  success: boolean;
  lawyers?: SheetLawyer[];
  stats?: {
    total: number;
    by_classification: {
      soutien_public: number;
      c1: number;
      c2: number;
      c3: number;
      blacklist: number;
      unclassified: number;
    };
    by_voting: {
      first_round: number;
      second_round: number;
      both_rounds: number;
      no_vote: number;
    };
    top_years_by_oath: Array<{ year: number; count: number }>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Paramètres de pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Paramètres de filtrage
    const classificationFilter = searchParams.get('classification') || 'all';
    const cabinetFilter = searchParams.get('cabinet') || '';
    const voteFilter = searchParams.get('vote') || 'all';
    const searchQuery = searchParams.get('search') || '';
    
    // Support for multiple filters (comma-separated)
    const classificationFilters = classificationFilter === 'all' ? [] : classificationFilter.split(',');
    const voteFilters = voteFilter === 'all' ? [] : voteFilter.split(',');
    
    // Récupération des données depuis Google Sheets
    console.log('🔍 Récupération des avocats depuis Google Sheets...');
    const allLawyers = await googleSheets.readLawyers();
    console.log(`📊 ${allLawyers.length} avocats récupérés`);
    
    // Application des filtres
    let filteredLawyers = allLawyers.filter(lawyer => {
      // Filtre par classification (support multiple)
      if (classificationFilters.length > 0) {
        let matchesClassification = false;
        
        for (const filter of classificationFilters) {
          if (filter === 'soutien_public' && lawyer.soutien_public) {
            matchesClassification = true;
            break;
          }
          if (filter === 'c1' && lawyer.classement === 'C1') {
            matchesClassification = true;
            break;
          }
          if (filter === 'c2' && lawyer.classement === 'C2') {
            matchesClassification = true;
            break;
          }
          if (filter === 'c3' && lawyer.classement === 'C3') {
            matchesClassification = true;
            break;
          }
          if (filter === 'blacklist' && lawyer.classement === 'Blacklist') {
            matchesClassification = true;
            break;
          }
          if (filter === 'unclassified' && (!lawyer.classement || lawyer.classement === '')) {
            matchesClassification = true;
            break;
          }
        }
        
        if (!matchesClassification) return false;
      }
      
      // Filtre par cabinet
      if (cabinetFilter && !lawyer.cabinet.toLowerCase().includes(cabinetFilter.toLowerCase())) {
        return false;
      }
      
      // Filtre par vote (support multiple)
      if (voteFilters.length > 0) {
        let matchesVote = false;
        
        for (const filter of voteFilters) {
          if (filter === 'first_round' && lawyer.premier_tour_vote) {
            matchesVote = true;
            break;
          }
          if (filter === 'second_round' && lawyer.second_tour_vote) {
            matchesVote = true;
            break;
          }
          if (filter === 'both' && lawyer.premier_tour_vote && lawyer.second_tour_vote) {
            matchesVote = true;
            break;
          }
          if (filter === 'none' && !lawyer.premier_tour_vote && !lawyer.second_tour_vote) {
            matchesVote = true;
            break;
          }
        }
        
        if (!matchesVote) return false;
      }
      
      // Filtre par recherche textuelle (nom, prénom, cabinet)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          lawyer.prenomnom.toLowerCase().includes(query) ||
          lawyer.nom_complet.toLowerCase().includes(query) ||
          lawyer.cabinet.toLowerCase().includes(query) ||
          lawyer.email.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
    
    console.log(`🔍 ${filteredLawyers.length} avocats après filtrage`);
    
    // Calcul des statistiques
    const stats = {
      total: allLawyers.length,
      by_classification: {
        soutien_public: allLawyers.filter(l => l.soutien_public).length,
        c1: allLawyers.filter(l => l.classement === 'C1').length,
        c2: allLawyers.filter(l => l.classement === 'C2').length,
        c3: allLawyers.filter(l => l.classement === 'C3').length,
        blacklist: allLawyers.filter(l => l.classement === 'Blacklist').length,
        unclassified: allLawyers.filter(l => !l.classement || l.classement === '').length,
      },
      by_voting: {
        first_round: allLawyers.filter(l => l.premier_tour_vote).length,
        second_round: allLawyers.filter(l => l.second_tour_vote).length,
        both_rounds: allLawyers.filter(l => l.premier_tour_vote && l.second_tour_vote).length,
        no_vote: allLawyers.filter(l => !l.premier_tour_vote && !l.second_tour_vote).length,
      },
      top_years_by_oath: [] as Array<{year: number, count: number}>
    };
    
    // Calcul du top 5 des années de serment
    const yearCounts = allLawyers.reduce((acc, lawyer) => {
      if (lawyer.annee_serment && lawyer.annee_serment > 0) {
        acc[lawyer.annee_serment] = (acc[lawyer.annee_serment] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    
    stats.top_years_by_oath = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Application de la pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLawyers = filteredLawyers.slice(startIndex, endIndex);
    
    const pagination = {
      page,
      limit,
      total: filteredLawyers.length,
      totalPages: Math.ceil(filteredLawyers.length / limit)
    };
    
    console.log(`📄 Page ${page}/${pagination.totalPages} - ${paginatedLawyers.length} avocats retournés`);
    
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
    
    const response: LawyersApiResponse = {
      success: true,
      lawyers: lawyersWithAssignments,
      stats,
      pagination
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Erreur API lawyers:', error);
    const errorResponse: LawyersApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}