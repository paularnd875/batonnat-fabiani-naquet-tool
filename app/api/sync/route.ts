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

    // 3. Lire les taux de participation réels depuis Google Sheets
    console.log('📈 Lecture taux de participation depuis Google Sheets...');
    let participationRatesMap = new Map<string, number>();
    try {
      const firmsParticipationData = await googleSheets.readFirmsData();
      console.log(`📊 ${firmsParticipationData.length} cabinets avec taux trouvés dans Google Sheets`);
      
      firmsParticipationData.forEach(firmData => {
        participationRatesMap.set(firmData.cabinet, firmData.taux_participation_moyen);
      });
    } catch (error) {
      console.warn('⚠️ Impossible de lire les taux depuis Google Sheets, utilisation calcul local:', error);
    }

    // 4. Recalculer les statistiques des cabinets
    console.log('📊 Recalcul statistiques cabinets...');
    
    // Supprimer toutes les anciennes stats pour éviter les incohérences
    const { error: deleteError } = await supabase
      .from('firms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tous les enregistrements
    
    if (deleteError) {
      console.log('Note: Première synchronisation, aucune stat à supprimer');
    }
    
    // Récupérer tous les avocats SANS jointure pour éviter les problèmes de doublons
    const { data: allLawyers } = await supabase
      .from('lawyers')
      .select(`
        cabinet,
        classement,
        prenomnom
      `);

    let firmsArray = [];
    if (allLawyers) {
      // Calculer les stats par cabinet
      const firmsMap = new Map();
      
      allLawyers.forEach((lawyer: any) => {
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
        
        // Compter les classements
        switch (lawyer.classement) {
          case 'C1': firm.c1_count++; break;
          case 'C2': firm.c2_count++; break;
          case 'C3': firm.c3_count++; break;
          case 'Blacklist': firm.bl_count++; break;
          default: firm.unclassified_count++; break;
        }
      });
      
      // Récupérer séparément les assignations pour compter les avocats assignés par cabinet
      // Approche simple : compter juste les assignations uniques par lawyer_prenomnom
      const { data: assignedLawyers } = await supabase
        .from('assignments')
        .select('lawyer_prenomnom');
        
      // Pour chaque avocat assigné, trouver son cabinet et incrémenter le compteur
      if (assignedLawyers) {
        const uniqueAssigned = new Set(assignedLawyers.map((a: any) => a.lawyer_prenomnom));
        
        uniqueAssigned.forEach(lawyerName => {
          // Trouver l'avocat dans notre liste pour obtenir son cabinet
          const lawyer = allLawyers.find((l: any) => l.prenomnom === lawyerName);
          if (lawyer) {
            const cabinet = lawyer.cabinet || 'Individuel';
            const firm = firmsMap.get(cabinet);
            if (firm) {
              firm.assigned_count++;
            }
          }
        });
      }

      // Insérer les nouvelles stats avec taux de participation réels
      firmsArray = Array.from(firmsMap.values()).map(firm => {
        // D'abord chercher le taux réel depuis Google Sheets
        let participationRate = participationRatesMap.get(firm.name);
        
        // Si pas trouvé, essayer avec des variantes du nom
        if (participationRate === undefined) {
          const nameVariants = [
            firm.name,
            firm.name.toUpperCase(),
            firm.name.toLowerCase(),
            firm.name.trim(),
          ];
          
          for (const variant of nameVariants) {
            participationRate = participationRatesMap.get(variant);
            if (participationRate !== undefined) break;
          }
        }
        
        // Si toujours pas trouvé, utiliser le calcul local comme fallback
        if (participationRate === undefined) {
          participationRate = firm.lawyer_count > 0 ? firm.assigned_count / firm.lawyer_count : 0;
        }
        
        return {
          ...firm,
          participation_rate: participationRate
        };
      });
      console.log(`📊 Recalcul pour ${firmsArray.length} cabinets (${allLawyers.length} avocats traités)`);
      
      // Afficher quelques exemples pour debugging
      const exampleFirms = firmsArray.slice(0, 3);
      exampleFirms.forEach(firm => {
        console.log(`🏢 ${firm.name}: ${firm.lawyer_count} avocats (C1:${firm.c1_count}, C2:${firm.c2_count}, C3:${firm.c3_count}, BL:${firm.bl_count}, NC:${firm.unclassified_count}, Assignés:${firm.assigned_count})`);
      });
      
      const { error: firmsError } = await supabase
        .from('firms')
        .insert(firmsArray);

      if (firmsError) {
        console.error('Erreur stats cabinets:', firmsError);
        throw firmsError;
      }
      
      console.log(`✅ ${firmsArray.length} cabinets mis à jour avec stats correctes`);
    }

    return NextResponse.json({
      success: true,
      message: 'Synchronisation terminée avec succès',
      timestamp: new Date().toISOString(),
      stats: {
        lawyers_synced: totalInserted,
        firms_updated: firmsArray ? firmsArray.length : 0,
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