import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET - Récupérer tous les membres d'équipe
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('prenom', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      team_members: data || [],
    });

  } catch (error) {
    console.error('Erreur récupération équipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// POST - Ajouter un membre d'équipe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prenom, nom, email } = body;

    if (!prenom || !nom || !email) {
      return NextResponse.json({
        success: false,
        error: 'Prénom, nom et email requis',
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('team_members')
      .insert({ prenom, nom, email })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      team_member: data,
    });

  } catch (error) {
    console.error('Erreur ajout membre équipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

// DELETE - Supprimer un membre d'équipe
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { team_member_id } = body;

    if (!team_member_id) {
      return NextResponse.json({
        success: false,
        error: 'team_member_id requis',
      }, { status: 400 });
    }

    // Vérifier d'abord s'il y a des assignations pour ce membre
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id')
      .eq('team_member_id', team_member_id);

    if (assignmentsError) throw assignmentsError;

    if (assignments && assignments.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Impossible de supprimer ce membre : ${assignments.length} assignation(s) en cours. Désassignez d'abord tous les avocats.`,
      }, { status: 400 });
    }

    // Supprimer le membre d'équipe
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', team_member_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Membre d\'équipe supprimé avec succès',
    });

  } catch (error) {
    console.error('Erreur suppression membre équipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}