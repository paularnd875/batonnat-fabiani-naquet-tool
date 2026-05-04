import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('🔍 Analyse correspondance noms cabinets...');
    
    // 1. Récupérer les cabinets depuis Google Sheets
    const sheetsData = await googleSheets.readFirmsData();
    console.log(`📊 ${sheetsData.length} cabinets trouvés dans Google Sheets`);
    
    // 2. Récupérer les cabinets depuis la base locale
    const { data: localFirms } = await supabase
      .from('firms')
      .select('name, lawyer_count')
      .order('lawyer_count', { ascending: false })
      .limit(100); // Top 100 cabinets
    
    console.log(`🏢 ${localFirms?.length || 0} cabinets trouvés en base locale`);
    
    // 3. Analyser les correspondances
    const sheetsNamesSet = new Set(sheetsData.map((f: any) => f.cabinet.toLowerCase().trim()));
    const localNamesSet = new Set((localFirms || []).map((f: any) => f.name.toLowerCase().trim()));
    
    // Correspondances exactes
    const exactMatches = sheetsData.filter(sheetFirm => {
      return localNamesSet.has(sheetFirm.cabinet.toLowerCase().trim());
    });
    
    // Cabinets uniquement dans Sheets
    const onlyInSheets = sheetsData.filter(sheetFirm => {
      return !localNamesSet.has(sheetFirm.cabinet.toLowerCase().trim());
    });
    
    // Grands cabinets uniquement en base locale
    const onlyInLocal = (localFirms || [])
      .filter((localFirm: any) => {
        return !sheetsNamesSet.has(localFirm.name.toLowerCase().trim()) && 
               localFirm.lawyer_count > 10; // Seulement les cabinets significatifs
      })
      .slice(0, 20); // Top 20
    
    // Correspondances partielles possibles
    const partialMatches: any[] = [];
    onlyInSheets.forEach(sheetFirm => {
      const sheetName = sheetFirm.cabinet.toLowerCase();
      (localFirms || []).forEach((localFirm: any) => {
        const localName = localFirm.name.toLowerCase();
        
        // Vérifier si l'un contient l'autre ou s'ils partagent des mots significatifs
        if (sheetName.length > 3 && localName.length > 3) {
          if (sheetName.includes(localName.substring(0, Math.min(10, localName.length))) ||
              localName.includes(sheetName.substring(0, Math.min(10, sheetName.length)))) {
            partialMatches.push({
              sheets_name: sheetFirm.cabinet,
              local_name: localFirm.name,
              sheets_rate: sheetFirm.taux_participation_moyen,
              local_lawyers: localFirm.lawyer_count
            });
          }
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      analysis: {
        sheets_total: sheetsData.length,
        local_total: localFirms?.length || 0,
        exact_matches: exactMatches.length,
        only_in_sheets: onlyInSheets.length,
        only_in_local: onlyInLocal.length,
        partial_matches: partialMatches.length
      },
      exact_matches: exactMatches.map((f: any) => ({
        name: f.cabinet,
        participation_rate: f.taux_participation_moyen
      })),
      only_in_sheets: onlyInSheets.map((f: any) => ({
        name: f.cabinet,
        participation_rate: f.taux_participation_moyen
      })),
      only_in_local: onlyInLocal.map((f: any) => ({
        name: f.name,
        lawyer_count: f.lawyer_count
      })),
      partial_matches: partialMatches.slice(0, 10) // Top 10 correspondances partielles
    });

  } catch (error) {
    console.error('❌ Erreur analyse correspondance:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}