import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Vérifier l'authentification avec le cookie auth-session existant
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non connecté'
      }, { status: 401 });
    }

    // Récupérer les informations utilisateur depuis les cookies
    const userInfoCookie = cookieStore.get('user-info');
    let currentUser;

    if (userInfoCookie) {
      try {
        currentUser = JSON.parse(userInfoCookie.value);
      } catch {
        // Fallback utilisateur par défaut si parsing échoue
        currentUser = {
          id: 1,
          prenom: 'Utilisateur',
          nom: 'Test',
          email: 'test@example.com'
        };
      }
    } else {
      // Utilisateur par défaut si pas de cookie user-info
      currentUser = {
        id: 1,
        prenom: 'Utilisateur',
        nom: 'Test',
        email: 'test@example.com'
      };
    }

    const db = getDatabase();
    
    // Récupérer tous les logs non exportés
    const unexportedLogs = await db.getAllStatusChangeLogs({ exported: false });
    
    if (unexportedLogs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucun changement en attente à marquer comme mis à jour'
      });
    }

    // Marquer tous les logs non exportés comme exportés (MAJ dans la BDD)
    const logIds = unexportedLogs.map((log: any) => log.id);
    await db.markStatusChangesAsExported(logIds);

    console.log(`📊 Marquage MAJ BDD: ${unexportedLogs.length} changements marqués comme mis à jour dans la BDD par ${currentUser.prenom} ${currentUser.nom}`);

    return NextResponse.json({
      success: true,
      message: `${unexportedLogs.length} changements marqués comme mis à jour dans la BDD`,
      markedCount: unexportedLogs.length,
      markedBy: `${currentUser.prenom} ${currentUser.nom}`
    });

  } catch (error) {
    console.error('❌ Erreur marquage MAJ BDD:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}