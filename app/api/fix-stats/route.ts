import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { googleSheets } from '@/lib/google-sheets';

export async function POST() {
  try {
    console.log('🔧 Début réparation statistiques cabinets...');

    // 1. Supprimer TOUTES les anciennes stats pour éviter les conflits
    console.log('🗑️ Suppression anciennes statistiques...');
    await supabase.from('firms').delete().neq('name', '');

    // 2. Récupérer TOUS les avocats par pagination pour éviter les limites
    console.log('📊 Lecture TOUS les avocats par pagination...');
    
    let allLawyers = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: lawyers, error: lawyersError } = await supabase
        .from('lawyers')
        .select('cabinet, classement, prenomnom')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (lawyersError) {
        throw new Error(`Erreur lecture avocats page ${page}: ${lawyersError.message}`);
      }

      if (!lawyers || lawyers.length === 0) {
        hasMore = false;
      } else {
        allLawyers = allLawyers.concat(lawyers);
        console.log(`📄 Page ${page}: ${lawyers.length} avocats (Total: ${allLawyers.length})`);
        
        if (lawyers.length < pageSize) {
          hasMore = false;
        }
        page++;
      }
    }

    if (!allLawyers || allLawyers.length === 0) {
      throw new Error('Aucun avocat trouvé');
    }

    console.log(`📊 Total avocats récupérés: ${allLawyers.length}`);

    // Lire les taux de participation réels depuis Google Sheets
    console.log('📈 Lecture taux de participation depuis Google Sheets...');
    let participationRatesMap = new Map<string, number>();
    try {
      const firmsParticipationData = await googleSheets.readFirmsData();
      console.log(`📊 ${firmsParticipationData.length} cabinets avec taux trouvés dans Google Sheets`);
      
      firmsParticipationData.forEach(firmData => {
        participationRatesMap.set(firmData.cabinet, firmData.taux_participation_moyen);
      });
      
      // Afficher quelques exemples
      const exampleParticipation = firmsParticipationData.slice(0, 3);
      exampleParticipation.forEach(firm => {
        console.log(`📈 ${firm.cabinet}: ${(firm.taux_participation_moyen * 100).toFixed(1)}%`);
      });
    } catch (error) {
      console.warn('⚠️ Impossible de lire les taux depuis Google Sheets, utilisation calcul local:', error);
    }

    // 3. Calculer les stats par cabinet
    console.log(`💾 Calcul stats pour ${allLawyers.length} avocats...`);
    const firmsMap = new Map();

    allLawyers.forEach(lawyer => {
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

    // 4. Récupérer TOUTES les assignations par pagination
    console.log('📋 Calcul assignations...');
    let allAssignments = [];
    let assignPage = 0;
    let hasMoreAssignments = true;

    while (hasMoreAssignments) {
      const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('lawyer_prenomnom')
        .range(assignPage * pageSize, (assignPage + 1) * pageSize - 1);

      if (assignError) {
        console.log(`⚠️ Erreur assignations page ${assignPage}, continuer sans:`, assignError);
        break;
      }

      if (!assignments || assignments.length === 0) {
        hasMoreAssignments = false;
      } else {
        allAssignments = allAssignments.concat(assignments);
        console.log(`📋 Page assignations ${assignPage}: ${assignments.length} (Total: ${allAssignments.length})`);
        
        if (assignments.length < pageSize) {
          hasMoreAssignments = false;
        }
        assignPage++;
      }
    }

    if (allAssignments.length > 0) {
      const uniqueAssigned = new Set(allAssignments.map(a => a.lawyer_prenomnom));
      console.log(`📊 ${uniqueAssigned.size} avocats uniques assignés`);
      
      uniqueAssigned.forEach(lawyerName => {
        const lawyer = allLawyers.find(l => l.prenomnom === lawyerName);
        if (lawyer) {
          const cabinet = lawyer.cabinet || 'Individuel';
          const firm = firmsMap.get(cabinet);
          if (firm) {
            firm.assigned_count++;
          }
        }
      });
    }

    // 5. Calculer le taux de participation pour chaque cabinet
    const firmsArray = Array.from(firmsMap.values()).map(firm => {
      // D'abord chercher le taux réel depuis Google Sheets
      let participationRate = participationRatesMap.get(firm.name);
      
      // Si pas trouvé, essayer avec des variantes du nom
      if (participationRate === undefined) {
        // Essayer les variantes courantes
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
    
    console.log(`✅ Insertion ${firmsArray.length} cabinets avec taux de participation...`);

    // Afficher quelques exemples
    const examples = firmsArray.slice(0, 5);
    examples.forEach(firm => {
      console.log(`🏢 ${firm.name}: ${firm.lawyer_count} avocats (Assignés:${firm.assigned_count}, Taux:${(firm.participation_rate * 100).toFixed(1)}%, C1:${firm.c1_count}, C2:${firm.c2_count}, C3:${firm.c3_count})`)
    });

    const { error: insertError } = await supabase
      .from('firms')
      .insert(firmsArray);

    if (insertError) {
      throw new Error(`Erreur insertion: ${insertError.message}`);
    }

    console.log(`🎉 Réparation terminée: ${firmsArray.length} cabinets mis à jour`);

    return NextResponse.json({
      success: true,
      message: 'Statistiques réparées avec succès',
      stats: {
        cabinets_updated: firmsArray.length,
        lawyers_processed: allLawyers.length,
      }
    });

  } catch (error) {
    console.error('❌ Erreur réparation stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}