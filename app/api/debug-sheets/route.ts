import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log(' DEBUG COMPLET: Diagnostic Google Sheets...');
    
    // Test 1: Lecture des avocats
    const lawyers = await googleSheets.readLawyers();
    console.log(` ${lawyers.length} avocats lus avec succès`);
    
    // Test 2: Compter les statuts assignés
    const statusCounts = {
      C1: lawyers.filter(l => l.classement === 'C1').length,
      C2: lawyers.filter(l => l.classement === 'C2').length,
      C3: lawyers.filter(l => l.classement === 'C3').length,
      Blacklist: lawyers.filter(l => l.classement === 'Blacklist').length,
      'Non classifié': lawyers.filter(l => !l.classement || l.classement === 'Non classifié').length
    };
    
    // Test 3: Trouver quelques exemples avec statuts
    const examplesWithStatus = lawyers
      .filter(l => l.classement && l.classement !== 'Non classifié')
      .slice(0, 5);
    
    // Test 4: Test de mise à jour (simulation)
    let updateTestResult = 'Non testé';
    try {
      // Essayer de trouver un avocat pour tester la mise à jour
      const testLawyer = lawyers.find(l => l.prenomnom);
      if (testLawyer) {
        // Ne pas vraiment changer, juste tester l'access
        updateTestResult = `Prêt à tester sur: ${testLawyer.prenomnom}`;
      }
    } catch (error) {
      updateTestResult = `Erreur: ${error instanceof Error ? error.message : error}`;
    }
    
    console.log(' Répartition des statuts:', statusCounts);
    
    return NextResponse.json({
      success: true,
      message: 'DEBUG COMPLET: Google Sheets diagnostiqué',
      stats: {
        total_lawyers: lawyers.length,
        status_distribution: statusCounts,
        examples_with_status: examplesWithStatus.map(l => ({
          prenomnom: l.prenomnom,
          nom_complet: l.nom_complet,
          classement: l.classement,
          cabinet: l.cabinet
        })),
        update_test: updateTestResult,
        environment: process.env.VERCEL ? 'Vercel Production' : 'Local Development',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(' Erreur diagnostic Google Sheets:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : null,
      environment: process.env.VERCEL ? 'Vercel Production' : 'Local Development',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}