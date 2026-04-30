import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    
    // Récupérer les avocats du cabinet avec leurs assignations
    // Gérer le cas spécial "Individuel" = cabinet vide
    let lawyersQuery = supabase
      .from('lawyers')
      .select(`
        *,
        assignments (
          id,
          team_member_id,
          assigned_at,
          team_members (
            id,
            prenom,
            nom,
            email
          )
        )
      `)
      .order('nom_complet', { ascending: true })
      .limit(50);

    if (cabinetName === 'Individuel') {
      // Pour "Individuel", chercher les cabinets vides ou null
      lawyersQuery = lawyersQuery.or('cabinet.is.null,cabinet.eq.""');
    } else {
      lawyersQuery = lawyersQuery.eq('cabinet', cabinetName);
    }

    const { data: lawyers, error } = await lawyersQuery;

    if (error) throw error;

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
        lawyers: lawyers || [],
        stats: firmStats,
        count: lawyers?.length || 0,
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