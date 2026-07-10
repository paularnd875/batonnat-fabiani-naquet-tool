import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { logAssignmentAction } from '@/lib/sheet-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .select('classement, nom_complet')
      .eq('prenomnom', lawyer_prenomnom)
      .single();

    if (lawyer?.classement === 'Blacklist') {
      return NextResponse.json({
        success: false,
        error: 'Impossible d\'assigner un avocat blacklisté',
      }, { status: 400 });
    }

    // Multi-soutiens : on AJOUTE une assignation (avocat ↔ membre) sans écraser
    // les autres soutiens de l'avocat. Idempotent si le couple existe déjà.
    // Volontairement sans upsert onConflict : reste robuste avant ET après la
    // migration de contrainte (qui remplace l'unicité mono-colonne par le couple).
    const selectMember = `*, team_members ( id, prenom, nom, email )`;

    // 1. Le couple (avocat, membre) existe déjà ? -> succès idempotent, sans re-log.
    const { data: existingPair } = await supabase
      .from('assignments')
      .select(selectMember)
      .eq('lawyer_prenomnom', lawyer_prenomnom)
      .eq('team_member_id', team_member_id)
      .maybeSingle();

    let data: any = existingPair;

    if (!existingPair) {
      // 2. Sinon on insère la nouvelle assignation.
      const { data: inserted, error } = await supabase
        .from('assignments')
        .insert({
          lawyer_prenomnom,
          team_member_id,
          assigned_at: new Date().toISOString(),
        })
        .select(selectMember)
        .single();

      if (error) {
        // 23505 = violation d'unicité. Deux cas possibles :
        //  - couple inséré en concurrence -> on le relit (succès idempotent) ;
        //  - AVANT migration : l'ancienne contrainte mono-colonne bloque un 2e
        //    soutien pour cet avocat -> message clair.
        if ((error as any).code === '23505') {
          const { data: raced } = await supabase
            .from('assignments')
            .select(selectMember)
            .eq('lawyer_prenomnom', lawyer_prenomnom)
            .eq('team_member_id', team_member_id)
            .maybeSingle();
          if (raced) {
            data = raced;
          } else {
            return NextResponse.json({
              success: false,
              error: "La multi-assignation n'est pas encore activée (migration de base en attente). Cet avocat est déjà assigné à un autre membre.",
            }, { status: 409 });
          }
        } else {
          throw error;
        }
      } else {
        data = inserted;
        // Journalisation durable dans l'onglet Google Sheet (best-effort),
        // uniquement sur une VRAIE nouvelle assignation.
        const m = (inserted as any)?.team_members;
        const membre = m ? `${m.prenom || ''} ${m.nom || ''}`.trim() : '';
        await logAssignmentAction({
          avocat: (lawyer as any)?.nom_complet || lawyer_prenomnom,
          prenomnom: lawyer_prenomnom,
          membre,
          action: 'Assignation',
        });
      }
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Echec de l\'assignation, aucune donnée retournée',
      }, { status: 500 });
    }

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
    const { lawyer_prenomnom, team_member_id } = body;

    if (!lawyer_prenomnom) {
      return NextResponse.json({
        success: false,
        error: 'lawyer_prenomnom requis',
      }, { status: 400 });
    }

    // Multi-soutiens : si team_member_id est fourni, on ne retire QUE ce soutien.
    // Sinon (compatibilité ascendante), on retire tous les soutiens de l'avocat.
    console.log(' DELETE: Tentative suppression assignation pour:', lawyer_prenomnom, team_member_id ? `(membre ${team_member_id})` : '(tous soutiens)');

    // Vérifier d'abord ce qui existe (filtré sur le couple si un membre est visé)
    let checkQuery = supabase
      .from('assignments')
      .select('*, lawyers(nom_complet), team_members(prenom, nom)')
      .eq('lawyer_prenomnom', lawyer_prenomnom);
    if (team_member_id) checkQuery = checkQuery.eq('team_member_id', team_member_id);
    const { data: existing, error: checkError } = await checkQuery;

    if (checkError) {
      console.error(' DELETE: Erreur vérification existence:', checkError);
      throw checkError;
    }

    console.log(' DELETE: Assignations trouvées:', existing?.length, existing);

    // Suppression idempotente : si rien à supprimer, l'état voulu est déjà
    // atteint (assignation absente). On renvoie un succès pour que le front
    // rafraichisse sa liste sans afficher d'erreur sur une ligne déjà retirée.
    if (!existing || existing.length === 0) {
      console.log(' DELETE: Aucune assignation à supprimer (déjà absente), réponse idempotente');
      return NextResponse.json({
        success: true,
        message: 'Aucune assignation à supprimer (déjà absente)',
        debug: {
          lawyer_prenomnom,
          team_member_id: team_member_id || null,
          deleted_count: 0,
          existing_before: 0
        }
      });
    }

    let deleteQuery = supabase
      .from('assignments')
      .delete({ count: 'exact' })
      .eq('lawyer_prenomnom', lawyer_prenomnom);
    if (team_member_id) deleteQuery = deleteQuery.eq('team_member_id', team_member_id);
    const { error, count } = await deleteQuery;

    if (error) {
      console.error(' DELETE: Erreur suppression:', error);
      throw error;
    }

    console.log(' DELETE: Assignation supprimée, lignes affectées:', count);

    // Journalisation durable dans l'onglet Google Sheet (best-effort) : une ligne
    // par soutien retiré (utile quand on retire tous les soutiens d'un coup).
    for (const ex of (existing as any[])) {
      const lw = ex?.lawyers;
      const mb = ex?.team_members;
      await logAssignmentAction({
        avocat: lw?.nom_complet || lawyer_prenomnom,
        prenomnom: lawyer_prenomnom,
        membre: mb ? `${mb.prenom || ''} ${mb.nom || ''}`.trim() : '',
        action: 'Désassignation',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Assignation supprimée (${count || 'inconnu'} ligne(s) affectée(s))`,
      debug: {
        lawyer_prenomnom,
        team_member_id: team_member_id || null,
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