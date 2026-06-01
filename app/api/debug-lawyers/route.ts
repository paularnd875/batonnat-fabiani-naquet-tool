import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    // Lire tous les avocats avec la fonction readLawyers
    const lawyers = await googleSheets.readLawyers();
    
    // Analyser les classements
    const classements: { [key: string]: number } = {};
    const origines = new Set();
    const soutienPublicCount = lawyers.filter((l: any) => l.soutien_public).length;
    
    lawyers.forEach((lawyer: any) => {
      const classement = lawyer.classement || 'Non classé';
      classements[classement] = (classements[classement] || 0) + 1;
      
      if (lawyer.origine && lawyer.origine.trim()) {
        origines.add(lawyer.origine.trim());
      }
    });
    
    // Échantillon de 5 avocats avec classements et origines
    const sample = lawyers
      .filter((l: any) => l.classement || l.origine || l.soutien_public)
      .slice(0, 10)
      .map((l: any) => ({
        nom: l.nom_complet,
        classement: l.classement,
        origine: l.origine,
        soutien_public: l.soutien_public,
        cabinet: l.cabinet
      }));
    
    return NextResponse.json({
      success: true,
      total_lawyers: lawyers.length,
      soutien_public_count: soutienPublicCount,
      classements,
      origines_uniques: Array.from(origines),
      sample_with_data: sample
    });

  } catch (error) {
    console.error(' Erreur debug lawyers:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}