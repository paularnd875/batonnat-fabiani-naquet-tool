import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Supprimer le cookie de session
    cookieStore.delete('auth-session');
    
    console.log('✅ Déconnexion réussie - session supprimée');
    
    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la déconnexion'
    }, { status: 500 });
  }
}