import { NextResponse } from 'next/server';
import { getTeamMembers, addTeamMember } from '@/lib/team-store';

// Profils de sélection = membres d'équipe (Vercel Blob, plus de Supabase/SQLite).
// Toujours servir une liste fraîche.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const members = await getTeamMembers();
    const users = members
      .map((m) => ({ id: m.id, nom: m.nom, prenom: m.prenom, email: m.email, created_at: m.created_at }))
      .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''));

    console.log(` ${users.length} utilisateurs récupérés`);
    return NextResponse.json({ success: true, users });
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

    const existing = (await getTeamMembers()).find(
      (m) => (m.email || '').toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà'
      }, { status: 409 });
    }

    const user = await addTeamMember({ nom: nom.trim(), prenom: prenom.trim(), email: email.trim() });
    console.log(` Utilisateur créé: ${user.prenom} ${user.nom} (${user.email})`);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error(' Erreur création utilisateur:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
