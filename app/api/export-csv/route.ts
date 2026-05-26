import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { cookies } from 'next/headers';

export async function POST() {
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
    
    // Récupérer tous les logs non exportés
    const unexportedLogs = await db.getAllStatusChangeLogs({ exported: false });
    
    if (unexportedLogs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun changement de statut à exporter'
      }, { status: 400 });
    }

    // Fonction d'uniformisation (répliquée depuis le code utilisateur)
    function uniformizePrenomNom(input: string): string {
      const noPunctuation = input.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"'']/g, "");
      const noSpaces = noPunctuation.replace(/\s/g, '');
      const noAccents = noSpaces.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const replaceC = noAccents.replace(/Ã§/g, "c");
      const noNumbers = replaceC.replace(/[0-9]/g, "");
      const noEmojis = noNumbers.replace(/[\p{Emoji}]/gu, "")
        .replace(/[😀-🙏🌀-🗿🚀-🛿🜀-🝿🞀-🟿🠀-🣿🤀-🧿🨀-🩯🩰-🫿☀-⛿✀-➿🇦-🇿‍️]/gu, "")
        .replace(/\u200D|\uFE0F/g, ""); // Supprime ZWJ et variantes emoji

      return noEmojis.toLowerCase();
    }

    // Créer le contenu CSV avec les colonnes demandées
    const csvHeaders = [
      'Nom',
      'Prénom', 
      'PrenomNom_Uniforme',
      'Email',
      'Cabinet',
      'Ancien_Statut',
      'Nouveau_Statut',
      'Assigné_Par',
      'Date_Heure'
    ];

    const csvRows = unexportedLogs.map((log: any) => {
      // Générer le prenomnom uniformisé
      const prenomnom_uniforme = uniformizePrenomNom(log.lawyer_prenom + log.lawyer_nom);
      
      return [
        `"${log.lawyer_nom || ''}"`,
        `"${log.lawyer_prenom || ''}"`,
        `"${prenomnom_uniforme}"`,
        `"${log.lawyer_email || ''}"`,
        `"${log.lawyer_cabinet || ''}"`,
        `"${log.old_status || 'Non classifié'}"`,
        `"${log.new_status}"`,
        `"${log.changed_by_name}"`,
        `"${new Date(log.changed_at).toLocaleString('fr-FR')}"`
      ].join(',');
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows
    ].join('\n');

    // Marquer tous ces logs comme exportés
    const logIds = unexportedLogs.map(log => log.id);
    db.markStatusChangesAsExported(logIds);

    console.log(`📊 Export CSV: ${unexportedLogs.length} changements de statut exportés`);

    // Retourner le CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="changements_statuts_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error('❌ Erreur export CSV:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}