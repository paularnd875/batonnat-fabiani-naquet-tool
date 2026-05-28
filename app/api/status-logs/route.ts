import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user-info');
    
    if (!userInfoCookie) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non connecté'
      }, { status: 401 });
    }

    const db = getDatabase();
    const logs = await db.getStatusChangeLogs();
    
    return NextResponse.json({
      success: true,
      logs: logs
    });

  } catch (error) {
    console.error('❌ Erreur récupération logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user-info');
    
    if (!userInfoCookie) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non connecté'
      }, { status: 401 });
    }

    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({
        success: false,
        error: 'IDs manquants ou invalides'
      }, { status: 400 });
    }

    const db = getDatabase();
    
    // Supprimer les logs SQLite par leurs IDs
    for (const id of ids) {
      await db.deleteStatusChangeLog(parseInt(id));
    }
    
    console.log(`✅ ${ids.length} logs SQLite supprimés`);
    
    return NextResponse.json({
      success: true,
      message: `${ids.length} logs supprimés avec succès`
    });

  } catch (error) {
    console.error('❌ Erreur suppression logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user-info');
    
    if (!userInfoCookie) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non connecté'
      }, { status: 401 });
    }

    const { ids, action } = await request.json();
    
    if (!ids || !Array.isArray(ids) || !action) {
      return NextResponse.json({
        success: false,
        error: 'Paramètres manquants ou invalides'
      }, { status: 400 });
    }

    const db = getDatabase();
    
    if (action === 'mark_as_exported') {
      // Marquer les logs SQLite comme exportés
      for (const id of ids) {
        await db.markStatusChangeAsExported(parseInt(id));
      }
      
      console.log(`✅ ${ids.length} logs SQLite marqués comme exportés`);
      
      return NextResponse.json({
        success: true,
        message: `${ids.length} logs marqués comme exportés`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Action non supportée'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Erreur mise à jour logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}