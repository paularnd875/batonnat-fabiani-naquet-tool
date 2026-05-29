import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST() {
  try {
    console.log('🧹 Suppression de toutes les assignations...');
    
    // Supprimer toutes les assignations
    const { error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .neq('id', 0); // Delete all where id != 0 (basically all records)

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      return NextResponse.json({ 
        error: 'Erreur lors de la suppression', 
        details: deleteError 
      }, { status: 500 });
    }

    // Vérifier que toutes les assignations ont été supprimées
    const { data: remainingAssignments, error: countError } = await supabase
      .from('assignments')
      .select('*', { count: 'exact' });

    if (countError) {
      console.error('❌ Erreur lors de la vérification:', countError);
      return NextResponse.json({ 
        error: 'Erreur lors de la vérification', 
        details: countError 
      }, { status: 500 });
    }

    console.log(`✅ Suppression terminée. Assignations restantes: ${remainingAssignments?.length || 0}`);

    return NextResponse.json({ 
      success: true,
      message: 'Toutes les assignations ont été supprimées',
      remaining: remainingAssignments?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error 
    }, { status: 500 });
  }
}