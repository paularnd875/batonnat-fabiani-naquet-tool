import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log(' Test lecture des taux de participation depuis Google Sheets...');
    
    // Lire les données de participation depuis Google Sheets
    const firmsData = await googleSheets.readFirmsData();
    console.log(` ${firmsData.length} cabinets avec taux trouvés dans Google Sheets`);
    
    // Afficher les premiers exemples
    const examples = firmsData.slice(0, 10);
    console.log(' Exemples de taux de participation :');
    examples.forEach((firm: any) => {
      console.log(`   ${firm.cabinet}: ${(firm.taux_participation_moyen * 100).toFixed(1)}%`);
    });
    
    // Statistiques
    const stats = {
      total_firms: firmsData.length,
      firms_with_participation: firmsData.filter((f: any) => f.taux_participation_moyen > 0).length,
      average_participation: firmsData.length > 0 ? 
        (firmsData.reduce((sum, f) => sum + f.taux_participation_moyen, 0) / firmsData.length) : 0,
      max_participation: Math.max(...firmsData.map((f: any) => f.taux_participation_moyen)),
      min_participation: Math.min(...firmsData.map((f: any) => f.taux_participation_moyen))
    };
    
    return NextResponse.json({
      success: true,
      message: 'Taux de participation lus avec succès',
      data: firmsData,
      stats,
      examples: examples.map((f: any) => ({
        cabinet: f.cabinet,
        taux_participation: f.taux_participation_moyen,
        taux_participation_percent: `${(f.taux_participation_moyen * 100).toFixed(1)}%`
      }))
    });

  } catch (error) {
    console.error(' Erreur lecture taux de participation:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    }, { status: 500 });
  }
}