import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // sync complète ~38k lignes

// Fonction pour obtenir le client Supabase de manière défensive
function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST() {
  try {
    console.log(' Début de synchronisation Google Sheets...');
    
    // Obtenir le client Supabase
    console.log(' Initialisation client Supabase...');
    const supabase = getSupabaseClient();
    console.log(' Client Supabase initialisé');
    
    // Test de connexion Supabase
    console.log(' Test connexion Supabase...');
    const { data: connectionTestData, error: connectionError } = await supabase.from('lawyers').select('*').limit(1);
    if (connectionError) {
      console.error(' Erreur test Supabase:', connectionError);
      throw new Error(`Supabase connexion failed: ${connectionError.message}`);
    }
    console.log(' Supabase connecté, test OK');
    
    // 1. Lecture des avocats depuis Google Sheets
    console.log(' Lecture onglet avocats...');
    const lawyers = await googleSheets.readLawyers();
    console.log(` ${lawyers.length} avocats lus depuis Google Sheets`);

    // 2. Insertion/mise à jour dans Supabase (on va utiliser l'upsert Supabase)
    console.log(' Synchronisation vers base de données...');
    
    // Préparer les données pour Supabase et éliminer les doublons
    const uniqueLawyers = new Map();
    lawyers.forEach((lawyer: any) => {
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
          origine: lawyer.origine,
          soutien_public: lawyer.soutien_public,
          soutiens_precedents: lawyer.soutiens_precedents,
          ami_linkedin_mhf: lawyer.ami_linkedin_mhf,
          ami_linkedin_fn: lawyer.ami_linkedin_fn,
          raw_data: lawyer.raw_data,
          last_synced_at: new Date().toISOString()
        });
      }
    });
    
    const lawyersForDB = Array.from(uniqueLawyers.values());
    console.log(` ${lawyers.length} lignes lues  ${lawyersForDB.length} avocats uniques`);

    // Extraire les origines uniques pour créer les membres d'équipe
    const origines = new Set<string>();
    lawyersForDB.forEach((lawyer: any) => {
      if (lawyer.origine && lawyer.origine.trim()) {
        origines.add(lawyer.origine.trim());
      }
    });
    console.log(` Origines trouvées:`, Array.from(origines));

    // Test avec un seul avocat d'abord
    console.log(' Test avec un avocat:', JSON.stringify(lawyersForDB[0], null, 2));
    
    const { data: upsertTestResult, error: testUpsertError } = await supabase
      .from('lawyers')
      .upsert([lawyersForDB[0]], { 
        onConflict: 'prenomnom',
        ignoreDuplicates: false 
      });

    if (testUpsertError) {
      console.error(' Erreur test upsert:', JSON.stringify(testUpsertError, null, 2));
      throw new Error(`Test upsert failed: ${JSON.stringify(testUpsertError)}`);
    }
    
    console.log(' Test upsert réussi, procédure normale...');

    // Upsert de TOUS les avocats en lots de 500 (plus de bridage à 200)
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < lawyersForDB.length; i += batchSize) {
      const batch = lawyersForDB.slice(i, i + batchSize);
      console.log(` Insertion batch ${i + 1}-${Math.min(i + batchSize, lawyersForDB.length)}/${lawyersForDB.length}...`);

      const { error } = await supabase
        .from('lawyers')
        .upsert(batch, {
          onConflict: 'prenomnom',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(` Erreur batch ${i}-${i + batchSize}:`, JSON.stringify(error, null, 2));
        throw new Error(`Batch upsert failed: ${JSON.stringify(error)}`);
      }

      totalInserted += batch.length;
      console.log(` ${totalInserted}/${lawyersForDB.length} avocats synchronisés`);
    }

    // 3. Créer automatiquement les membres d'équipe basés sur les origines
    console.log(' Création des membres d\'équipe...');
    const teamMembersCount = await createTeamMembersFromOrigines(supabase, origines);
    
    // 4. Lire les taux de participation réels depuis Google Sheets
    console.log(' Lecture taux de participation depuis Google Sheets...');
    let participationRatesMap = new Map<string, number>();
    try {
      const firmsParticipationData = await googleSheets.readFirmsData();
      console.log(` ${firmsParticipationData.length} cabinets avec taux trouvés dans Google Sheets`);
      
      firmsParticipationData.forEach((firmData: any) => {
        participationRatesMap.set(firmData.cabinet, firmData.taux_participation_moyen);
      });
    } catch (error) {
      console.warn(' Impossible de lire les taux depuis Google Sheets, utilisation calcul local:', error);
    }

    // 4. Recalculer les statistiques des cabinets
    console.log(' Recalcul statistiques cabinets...');
    
    // Supprimer toutes les anciennes stats pour éviter les incohérences.
    // La table "firms" a pour clé primaire "name" (pas de colonne "id") -> on
    // filtre sur "name" pour réellement tout supprimer (sinon duplicate key).
    const { error: deleteError } = await supabase
      .from('firms')
      .delete()
      .neq('name', '__none__'); // Supprime tous les enregistrements

    if (deleteError) {
      console.log('Note: Première synchronisation, aucune stat à supprimer', deleteError?.message);
    }
    
    // Récupérer tous les avocats SANS jointure pour éviter les problèmes de doublons
    const { data: allLawyers } = await supabase
      .from('lawyers')
      .select(`
        cabinet,
        classement,
        prenomnom,
        soutien_public
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
            soutien_public_count: 0,
            unclassified_count: 0,
            assigned_count: 0
          });
        }
        
        const firm = firmsMap.get(cabinet);
        firm.lawyer_count++;
        
        // Compter les soutiens publics
        if (lawyer.soutien_public) {
          firm.soutien_public_count++;
        }
        
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
        
        uniqueAssigned.forEach((lawyerName: any) => {
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
      firmsArray = Array.from(firmsMap.values()).map((firm: any) => {
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
      console.log(` Recalcul pour ${firmsArray.length} cabinets (${allLawyers.length} avocats traités)`);
      
      // Afficher quelques exemples pour debugging
      const exampleFirms = firmsArray.slice(0, 3);
      exampleFirms.forEach((firm: any) => {
        console.log(` ${firm.name}: ${firm.lawyer_count} avocats (SP:${firm.soutien_public_count}, C1:${firm.c1_count}, C2:${firm.c2_count}, C3:${firm.c3_count}, BL:${firm.bl_count}, NC:${firm.unclassified_count}, Assignés:${firm.assigned_count})`);
      });
      
      const { error: firmsError } = await supabase
        .from('firms')
        .insert(firmsArray);

      if (firmsError) {
        console.error('Erreur stats cabinets:', firmsError);
        throw firmsError;
      }
      
      console.log(` ${firmsArray.length} cabinets mis à jour avec stats correctes`);
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
    console.error(' Erreur synchronisation complète:', error);
    // Détail complet, y compris pour les objets d'erreur Supabase (non-Error)
    const anyErr = error as any;
    const detail = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : {
          message: anyErr?.message,
          code: anyErr?.code,
          details: anyErr?.details,
          hint: anyErr?.hint,
          keys: anyErr && typeof anyErr === 'object' ? Object.keys(anyErr) : [],
          json: (() => { try { return JSON.stringify(anyErr); } catch { return String(anyErr); } })(),
        };
    console.error(' Détail erreur:', detail);

    return NextResponse.json({
      success: false,
      error: (error instanceof Error ? error.message : anyErr?.message) || detail.json || 'Erreur inconnue',
      errorType: typeof error,
      detail,
    }, { status: 500 });
  }
}

// Fonction pour créer automatiquement les membres d'équipe basés sur les origines
async function createTeamMembersFromOrigines(supabase: any, origines: Set<string>) {
  const teamMembersToCreate = [];
  
  // Mapping des noms vers emails prédéfinis
  const nameToEmail: { [key: string]: any } = {
    'Marie-Hélène': 'mh.fabiani@batonnat.fr',
    'Frédéric': 'fn@batonnat.fr'
  };
  
  for (const origine of origines) {
    if (!origine) continue;
    
    // Vérifier si ce membre d'équipe existe déjà
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('sheet_origin', origine)
      .single();
    
    if (!existingMember) {
      // Déterminer le prénom, nom et email
      let prenom = origine;
      let nom = '';
      let email = nameToEmail[origine] || `${origine.toLowerCase().replace(/\s+/g, '.')}@temp.batonnat.fr`;
      
      if (origine === 'Marie-Hélène') {
        prenom = 'Marie-Hélène';
        nom = 'Fabiani';
      } else if (origine === 'Frédéric') {
        prenom = 'Frédéric';
        nom = 'Naquet';
      }
      
      teamMembersToCreate.push({
        prenom,
        nom,
        email,
        sheet_origin: origine
      });
    }
  }
  
  if (teamMembersToCreate.length > 0) {
    const { error } = await supabase
      .from('team_members')
      .insert(teamMembersToCreate);
    
    if (error) {
      console.error('Erreur création membres équipe:', error);
    } else {
      console.log(` ${teamMembersToCreate.length} membres d'équipe créés automatiquement`);
    }
  }
  
  return teamMembersToCreate.length;
}