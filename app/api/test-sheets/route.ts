import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('🧪 Test diagnostic Google Sheets sur Vercel...');
    
    // Test 1: Lecture des avocats
    const lawyers = await googleSheets.readLawyers();
    console.log(`📊 ${lawyers.length} avocats lus avec succès`);
    
    // Test 2: Compter les statuts assignés
    const statusCounts = {
      C1: lawyers.filter(l => l.classement === 'C1').length,
      C2: lawyers.filter(l => l.classement === 'C2').length,
      C3: lawyers.filter(l => l.classement === 'C3').length,
      Blacklist: lawyers.filter(l => l.classement === 'Blacklist').length,
      'Non classifié': lawyers.filter(l => !l.classement || l.classement === 'Non classifié').length
    };
    
    // Test 3: Trouver quelques exemples avec statuts
    const examplesWithStatus = lawyers.filter(l => l.classement && l.classement !== 'Non classifié').slice(0, 3);
    
    console.log('📈 Répartition des statuts:', statusCounts);
    
    return NextResponse.json({
      success: true,
      message: 'Diagnostic Google Sheets complet',
      stats: {
        total_lawyers: lawyers.length,
        status_distribution: statusCounts,
        examples_with_status: examplesWithStatus.map(l => ({
          prenomnom: l.prenomnom,
          nom: l.nom,
          prenom: l.prenom,
          classement: l.classement
        })),
        environment: process.env.VERCEL ? 'Vercel Production' : 'Local Development',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur diagnostic Google Sheets:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : null,
      environment: process.env.VERCEL ? 'Vercel Production' : 'Local Development',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}