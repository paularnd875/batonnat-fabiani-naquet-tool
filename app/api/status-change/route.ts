import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';
import { googleSheets } from '@/lib/google-sheets';

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
    const statusChangeLog = db.logStatusChange({
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

    // Mettre à jour le Google Sheets avec le nouveau statut
    try {
      console.log(`🔄 Tentative mise à jour Google Sheets pour ${lawyerData.prenom} ${lawyerData.nom}: ${newStatus} (prenomnom: ${lawyerId})`);
      await googleSheets.updateLawyerStatus(lawyerId, newStatus);
      console.log(`✅ Google Sheets mis à jour avec succès pour ${lawyerData.prenom} ${lawyerData.nom}: ${newStatus}`);
    } catch (error) {
      console.error(`⚠️ Erreur mise à jour Google Sheets pour ${lawyerData.prenom} ${lawyerData.nom}:`, error);
      console.error('Stack trace complète:', error instanceof Error ? error.stack : error);
      // Ne pas faire échouer la requête si la mise à jour du Sheet échoue
      // Le changement est quand même enregistré en local
    }

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