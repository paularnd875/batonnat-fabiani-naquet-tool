import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { lawyerId, lawyerData, oldStatus, newStatus } = await request.json();

    // Vérifier les données requises
    if (!lawyerId || !lawyerData || oldStatus === undefined || newStatus === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Données manquantes pour le changement de statut'
      }, { status: 400 });
    }

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

    // Enregistrer le changement de statut dans la base de données
    const db = getDatabase();
    const statusChangeLog = await db.logStatusChange({
      lawyer_id: lawyerId,
      lawyer_nom: lawyerData.nom,
      lawyer_prenom: lawyerData.prenom,
      lawyer_email: lawyerData.email,
      lawyer_cabinet: lawyerData.cabinet,
      old_status: oldStatus || 'Non classifié',
      new_status: newStatus || 'Non classifié',
      changed_by_user_id: currentUser.id,
      changed_by_name: `${currentUser.prenom} ${currentUser.nom}`
    });

    console.log(`✅ Changement de statut enregistré: ${lawyerData.prenom} ${lawyerData.nom} (${oldStatus || 'Non classifié'} → ${newStatus || 'Non classifié'}) par ${currentUser.prenom} ${currentUser.nom}`);

    return NextResponse.json({
      success: true,
      log: statusChangeLog,
      message: `Statut modifié de "${oldStatus || 'Non classifié'}" vers "${newStatus || 'Non classifié'}"`
    });

  } catch (error) {
    console.error('❌ Erreur changement de statut:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}