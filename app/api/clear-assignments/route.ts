import { NextResponse } from 'next/server';
import { saveAllAssignments } from '@/lib/assignments-store';

export async function POST() {
  try {
    console.log(' Suppression de toutes les assignations...');

    // Vider le store Blob des assignations
    await saveAllAssignments([]);

    console.log(' Suppression terminée. Assignations restantes: 0');

    return NextResponse.json({
      success: true,
      message: 'Toutes les assignations ont été supprimées',
      remaining: 0
    });

  } catch (error) {
    console.error(' Erreur générale:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: error
    }, { status: 500 });
  }
}
