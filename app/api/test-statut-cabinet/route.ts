import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Testing statut cabinet column AH...');

    // Test direct pour récupérer un échantillon d'avocats avec leur statut cabinet
    const allLawyers = await googleSheets.readLawyers();
    const sampleLawyers = allLawyers.slice(0, 20); // Prendre les 20 premiers
    
    if (!sampleLawyers || sampleLawyers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun avocat trouvé'
      });
    }

    const results = sampleLawyers.map((lawyer, index) => ({
      ligne: index + 1,
      nom_complet: lawyer.nom_complet,
      statut_cabinet: lawyer.statut_cabinet || '',
      cabinet: lawyer.cabinet || '',
      has_statut: Boolean(lawyer.statut_cabinet?.trim())
    }));

    // Statistiques
    const totalRows = results.length;
    const rowsWithStatut = results.filter(r => r.has_statut).length;
    const statutTypes = results
      .filter(r => r.has_statut)
      .map(r => r.statut_cabinet)
      .filter((value, index, self) => self.indexOf(value) === index);

    return NextResponse.json({
      success: true,
      message: 'Test récupération statut cabinet colonne AH',
      timestamp: new Date().toISOString(),
      stats: {
        total_rows_tested: totalRows,
        rows_with_statut: rowsWithStatut,
        rows_without_statut: totalRows - rowsWithStatut,
        percentage_with_statut: Math.round((rowsWithStatut / totalRows) * 100)
      },
      statut_types: statutTypes,
      sample_data: results.slice(0, 10)
    });

  } catch (error) {
    console.error('Google Sheets statut cabinet test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Google Sheets: ' + (error as Error).message,
    });
  }
}