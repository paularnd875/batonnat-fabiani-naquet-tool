import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// PUT - Mettre à jour un membre d'équipe
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const memberId = resolvedParams.id;
    const body = await request.json();
    const { prenom, nom, email } = body;

    if (!prenom || !nom || !email) {
      return NextResponse.json({
        success: false,
        error: 'Prénom, nom et email requis',
      }, { status: 400 });
    }

    // Vérifier si l'email existe déjà pour un autre membre
    const { data: existingMembers, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('email', email)
      .neq('id', memberId);

    if (checkError) throw checkError;

    if (existingMembers && existingMembers.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cet email est déjà utilisé par un autre collaborateur',
      }, { status: 400 });
    }

    // Mettre à jour le membre
    const { data, error } = await supabase
      .from('team_members')
      .update({ prenom, nom, email })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Collaborateur non trouvé',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      team_member: data,
    });

  } catch (error) {
    console.error('Erreur mise à jour membre équipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}