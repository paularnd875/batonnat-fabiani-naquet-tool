import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST() {
  try {
    console.log('🏗️ Initialisation équipe de test...');
    
    const testTeam = [
      { prenom: 'Marie-Hélène', nom: 'Fabiani', email: 'mh.fabiani@batonnat2026.fr' },
      { prenom: 'Frédéric', nom: 'Naquet', email: 'f.naquet@batonnat2026.fr' },
      { prenom: 'Paul', nom: 'Arnould', email: 'paul.arnould@batonnat2026.fr' },
      { prenom: 'Sophie', nom: 'Martin', email: 'sophie.martin@batonnat2026.fr' },
      { prenom: 'Antoine', nom: 'Dubois', email: 'antoine.dubois@batonnat2026.fr' },
    ];

    // Vérifier et insérer les membres d'équipe un par un
    const insertedMembers = [];
    
    for (const member of testTeam) {
      // Vérifier si le membre existe déjà
      const { data: existing } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', member.email)
        .single();
      
      if (!existing) {
        // Insérer seulement s'il n'existe pas
        const { data: inserted, error: insertError } = await supabase
          .from('team_members')
          .insert(member)
          .select()
          .single();
        
        if (insertError) {
          console.error('Erreur insertion membre:', insertError);
          continue;
        }
        
        insertedMembers.push(inserted);
      } else {
        insertedMembers.push(existing);
      }
    }
    
    const data = insertedMembers;
    const error = null;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Équipe de test initialisée',
      team_members: data,
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('❌ Erreur initialisation équipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}