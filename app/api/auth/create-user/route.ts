import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { nom, prenom, email } = await request.json();

    if (!nom || !prenom || !email) {
      return NextResponse.json({
        success: false,
        error: 'Nom, prénom et email sont requis'
      }, { status: 400 });
    }

    const db = getDatabase();
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà'
      }, { status: 409 });
    }

    // Créer le nouvel utilisateur
    const newUser = db.createUser(
      nom.trim(),
      prenom.trim(),
      email.toLowerCase().trim()
    );

    console.log(`👤 Nouvel utilisateur créé: ${prenom} ${nom} (${email})`);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}