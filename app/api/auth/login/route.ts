import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Vérification que le mot de passe est fourni
    if (!password) {
      return NextResponse.json({
        success: false,
        error: 'Mot de passe requis'
      }, { status: 400 });
    }

    // Récupérer le mot de passe depuis les variables d'environnement
    const correctPassword = process.env.SITE_PASSWORD;
    
    if (!correctPassword) {
      console.error(' SITE_PASSWORD non configuré dans les variables d\'environnement');
      return NextResponse.json({
        success: false,
        error: 'Configuration manquante sur le serveur'
      }, { status: 500 });
    }

    // Vérifier le mot de passe
    if (password !== correctPassword) {
      console.log(' Tentative de connexion échouée - mot de passe incorrect');
      return NextResponse.json({
        success: false,
        error: 'Mot de passe incorrect'
      }, { status: 401 });
    }

    // Connexion réussie - créer une session
    const sessionToken = generateSessionToken();
    const cookieStore = await cookies();
    
    // Définir un cookie de session qui expire à la fermeture du navigateur
    cookieStore.set('auth-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Pas de maxAge = expire à la fermeture du navigateur
    });

    console.log(' Connexion réussie - session créée');
    
    return NextResponse.json({
      success: true,
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error(' Erreur lors de la connexion:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la connexion'
    }, { status: 500 });
  }
}

/**
 * Générer un token de session aléatoire
 */
function generateSessionToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('') + Date.now().toString(36);
}