import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// Toujours servir une liste fraîche : la liste des profils ne doit jamais être
// figée en cache (un ancien cache d'IDs pouvait casser la sélection de profil).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDatabase();
    const users = await db.getAllUsers();

    console.log(` ${users.length} utilisateurs récupérés`);

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error(' Erreur récupération utilisateurs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nom, prenom, email } = await request.json();

    if (!nom?.trim() || !prenom?.trim() || !email?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Tous les champs sont obligatoires'
      }, { status: 400 });
    }

    const db = getDatabase();
    
    // Vérifier si l'email existe déjà
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà'
      }, { status: 409 });
    }

    // Créer l'utilisateur
    const user = await db.createUser(nom.trim(), prenom.trim(), email.trim());

    console.log(` Utilisateur créé: ${user.prenom} ${user.nom} (${user.email})`);

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error(' Erreur création utilisateur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}