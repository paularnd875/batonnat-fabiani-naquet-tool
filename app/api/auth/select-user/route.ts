import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID utilisateur manquant'
      }, { status: 400 });
    }

    const db = getDatabase();
    const user = await db.getUserById(userId);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur introuvable'
      }, { status: 404 });
    }

    // Créer une session avec l'utilisateur sélectionné
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email
      }
    });

    // Ajouter les cookies de session
    response.cookies.set('auth-session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    });

    // Cookie avec les informations utilisateur (pour l'affichage dans l'interface)
    response.cookies.set('user-info', JSON.stringify({
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email
    }), {
      httpOnly: false, // Accessible côté client pour l'affichage
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    });

    console.log(` Utilisateur sélectionné: ${user.prenom} ${user.nom} (ID: ${user.id})`);

    return response;
  } catch (error) {
    console.error(' Erreur sélection utilisateur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}