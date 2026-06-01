import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET - Récupérer l'historique des assignations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Calcul de l'offset pour la pagination
    const offset = (page - 1) * limit;

    console.log(' Récupération historique assignations...');
    
    // Récupérer les assignations avec jointure sur les avocats et membres d'équipe
    const { data: assignments, error, count } = await supabase
      .from('assignments')
      .select(`
        id,
        lawyer_prenomnom,
        assigned_at,
        team_member_id,
        lawyers!inner(
          nom_complet,
          cabinet,
          classement,
          email,
          telephone,
          civilite
        ),
        team_members!inner(
          prenom,
          nom,
          email
        )
      `, { count: 'exact' })
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erreur récupération assignations:', error);
      throw error;
    }

    // Reformater les données pour la réponse
    const formattedAssignments = (assignments || []).map((assignment: any) => {
      // Gestion sécurisée de assigned_by
      let assignedBy = 'Système';
      try {
        if (assignment.team_members && 
            typeof assignment.team_members === 'object' && 
            !Array.isArray(assignment.team_members)) {
          const member = assignment.team_members;
          if (member.prenom && member.nom) {
            assignedBy = `${member.prenom} ${member.nom}`;
          }
        }
      } catch (error) {
        console.warn('Erreur parsing team_members:', error);
      }

      return {
        id: assignment.id,
        lawyer_prenomnom: assignment.lawyer_prenomnom,
        assigned_at: assignment.assigned_at,
        assigned_by: assignedBy,
        status: 'assigned', // Statut par défaut
        notes: null,
        // Informations de l'avocat depuis la jointure
        lawyer_nom_complet: assignment.lawyers?.nom_complet || null,
        lawyer_cabinet: assignment.lawyers?.cabinet || null,
        lawyer_classement: assignment.lawyers?.classement || null,
        lawyer_email: assignment.lawyers?.email || null,
        lawyer_telephone: assignment.lawyers?.telephone || null,
        lawyer_civilite: assignment.lawyers?.civilite || null,
      };
    });

    console.log(` ${formattedAssignments.length} assignations récupérées`);

    return NextResponse.json({
      success: true,
      assignments: formattedAssignments,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error(' Erreur API assignations:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      assignments: []
    }, { status: 500 });
  }
}

// POST - Créer ou modifier une assignation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lawyer_prenomnom, team_member_id } = body;

    if (!lawyer_prenomnom || !team_member_id) {
      return NextResponse.json({
        success: false,
        error: 'lawyer_prenomnom et team_member_id requis',
      }, { status: 400 });
    }

    // Vérifier que l'avocat n'est pas blacklisté
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('classement')
      .eq('prenomnom', lawyer_prenomnom)
      .single();

    if (lawyer?.classement === 'Blacklist') {
      return NextResponse.json({
        success: false,
        error: 'Impossible d\'assigner un avocat blacklisté',
      }, { status: 400 });
    }

    // Upsert l'assignation (écrase la précédente si elle existe)
    const { data, error } = await supabase
      .from('assignments')
      .upsert({ 
        lawyer_prenomnom, 
        team_member_id,
        assigned_at: new Date().toISOString()
      }, { 
        onConflict: 'lawyer_prenomnom',
        ignoreDuplicates: false 
      })
      .select(`
        *,
        team_members (
          id,
          prenom,
          nom,
          email
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      assignment: data,
    });

  } catch (error) {
    console.error('Erreur assignation:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// DELETE - Supprimer une assignation
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { lawyer_prenomnom } = body;

    if (!lawyer_prenomnom) {
      return NextResponse.json({
        success: false,
        error: 'lawyer_prenomnom requis',
      }, { status: 400 });
    }

    console.log(' DELETE: Tentative suppression assignation pour:', lawyer_prenomnom);

    // Vérifier d'abord si l'assignation existe
    const { data: existing, error: checkError } = await supabase
      .from('assignments')
      .select('*')
      .eq('lawyer_prenomnom', lawyer_prenomnom);

    if (checkError) {
      console.error(' DELETE: Erreur vérification existence:', checkError);
      throw checkError;
    }

    console.log(' DELETE: Assignations trouvées:', existing?.length, existing);

    const { error, count } = await supabase
      .from('assignments')
      .delete({ count: 'exact' })
      .eq('lawyer_prenomnom', lawyer_prenomnom);

    if (error) {
      console.error(' DELETE: Erreur suppression:', error);
      throw error;
    }

    console.log(' DELETE: Assignation supprimée, lignes affectées:', count);

    return NextResponse.json({
      success: true,
      message: `Assignation supprimée (${count} ligne(s) affectée(s))`,
      debug: {
        lawyer_prenomnom,
        deleted_count: count,
        existing_before: existing?.length || 0
      }
    });

  } catch (error) {
    console.error(' DELETE: Erreur suppression assignation:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}