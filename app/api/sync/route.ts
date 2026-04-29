import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';

export async function POST() {
  try {
    console.log('🔄 Début de synchronisation Google Sheets...');
    
    // 1. Lecture des avocats depuis Google Sheets
    console.log('📋 Lecture onglet avocats...');
    const lawyers = await googleSheets.readLawyers();
    console.log(`📊 ${lawyers.length} avocats lus depuis Google Sheets`);

    // 2. Insertion/mise à jour dans Supabase (on va utiliser l'upsert Supabase)
    console.log('💾 Synchronisation vers base de données...');
    
    // Préparer les données pour Supabase et éliminer les doublons
    const uniqueLawyers = new Map();
    lawyers.forEach(lawyer => {
      if (lawyer.prenomnom && !uniqueLawyers.has(lawyer.prenomnom)) {
        uniqueLawyers.set(lawyer.prenomnom, {
          prenomnom: lawyer.prenomnom,
          civilite: lawyer.civilite,
          nom_complet: lawyer.nom_complet,
          telephone: lawyer.telephone,
          email: lawyer.email,
          annee_serment: lawyer.annee_serment,
          cabinet: lawyer.cabinet,
          classement: lawyer.classement,
          soutiens_precedents: lawyer.soutiens_precedents,
          ami_linkedin_mhf: lawyer.ami_linkedin_mhf,
          ami_linkedin_fn: lawyer.ami_linkedin_fn,
          raw_data: lawyer.raw_data,
          last_synced_at: new Date().toISOString()
        });
      }
    });
    
    const lawyersForDB = Array.from(uniqueLawyers.values());
    console.log(`🔍 ${lawyers.length} lignes lues → ${lawyersForDB.length} avocats uniques`);

    // Upsert en lots de 100 pour éviter les timeouts
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < lawyersForDB.length; i += batchSize) {
      const batch = lawyersForDB.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('lawyers')
        .upsert(batch, { 
          onConflict: 'prenomnom',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Erreur batch ${i}-${i + batchSize}:`, error);
        throw error;
      }
      
      totalInserted += batch.length;
      console.log(`✅ ${totalInserted}/${lawyersForDB.length} avocats synchronisés`);
    }

    // 3. Recalculer les statistiques des cabinets
    console.log('📈 Recalcul statistiques cabinets...');
    
    const { data: firmStats } = await supabase
      .from('lawyers')
      .select(`
        cabinet,
        classement
      `);

    if (firmStats) {
      // Calculer les stats par cabinet
      const firmsMap = new Map();
      
      firmStats.forEach(lawyer => {
        const cabinet = lawyer.cabinet || 'Individuel';
        if (!firmsMap.has(cabinet)) {
          firmsMap.set(cabinet, {
            name: cabinet,
            lawyer_count: 0,
            c1_count: 0,
            c2_count: 0,
            c3_count: 0,
            bl_count: 0,
            unclassified_count: 0,
            assigned_count: 0
          });
        }
        
        const firm = firmsMap.get(cabinet);
        firm.lawyer_count++;
        
        switch (lawyer.classement) {
          case 'C1': firm.c1_count++; break;
          case 'C2': firm.c2_count++; break;
          case 'C3': firm.c3_count++; break;
          case 'Blacklist': firm.bl_count++; break;
          default: firm.unclassified_count++; break;
        }
      });

      // Upsert des stats de cabinets
      const firmsArray = Array.from(firmsMap.values());
      
      const { error: firmsError } = await supabase
        .from('firms')
        .upsert(firmsArray, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        });

      if (firmsError) {
        console.error('Erreur stats cabinets:', firmsError);
        throw firmsError;
      }
      
      console.log(`📊 ${firmsArray.length} cabinets mis à jour`);
    }

    return NextResponse.json({
      success: true,
      message: 'Synchronisation terminée avec succès',
      timestamp: new Date().toISOString(),
      stats: {
        lawyers_synced: totalInserted,
        firms_updated: firmStats ? Array.from(new Set(firmStats.map(l => l.cabinet))).length : 0,
      }
    });

  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
    }, { status: 500 });
  }
}