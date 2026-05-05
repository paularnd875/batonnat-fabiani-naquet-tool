import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { createClient } from '@supabase/supabase-js';

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
    console.log('👥 Création des membres d\'équipe basés sur les origines...');
    
    const supabase = getSupabaseClient();
    
    // 1. Récupérer les origines depuis Google Sheets
    const lawyers = await googleSheets.readLawyers();
    const origines = new Set<string>();
    
    lawyers.forEach(lawyer => {
      if (lawyer.origine && lawyer.origine.trim()) {
        origines.add(lawyer.origine.trim());
      }
    });
    
    console.log('🔍 Origines trouvées:', Array.from(origines));
    
    // 2. Récupérer les membres d'équipe existants
    const { data: existingMembers } = await supabase
      .from('team_members')
      .select('prenom, nom, email');
    
    console.log('👥 Membres existants:', existingMembers?.map(m => `${m.prenom} ${m.nom}`));
    
    // 3. Mapping des noms vers emails et infos complètes
    const nameToInfo = {
      'Marie-Hélène': {
        prenom: 'Marie-Hélène',
        nom: 'Fabiani',
        email: 'mh.fabiani@batonnat.fr'
      },
      'Frédéric': {
        prenom: 'Frédéric', 
        nom: 'Naquet',
        email: 'fn@batonnat.fr'
      }
    };
    
    // 4. Déterminer quels membres créer
    const teamMembersToCreate = [];
    
    for (const origine of origines) {
      if (!origine) continue;
      
      // Vérifier si ce membre existe déjà (par prénom)
      const existsAlready = existingMembers?.some(member => {
        if (nameToInfo[origine]) {
          return member.prenom === nameToInfo[origine].prenom && 
                 member.nom === nameToInfo[origine].nom;
        }
        return member.prenom === origine;
      });
      
      if (!existsAlready) {
        if (nameToInfo[origine]) {
          // Cas prédéfini (Marie-Hélène, Frédéric)
          teamMembersToCreate.push(nameToInfo[origine]);
        } else {
          // Cas générique pour autres noms
          teamMembersToCreate.push({
            prenom: origine,
            nom: '', // À remplir plus tard
            email: `${origine.toLowerCase().replace(/\s+/g, '.')}@temp.batonnat.fr`
          });
        }
      }
    }
    
    console.log('➕ Membres à créer:', teamMembersToCreate);
    
    // 5. Créer les nouveaux membres
    let createdCount = 0;
    if (teamMembersToCreate.length > 0) {
      const { error, data } = await supabase
        .from('team_members')
        .insert(teamMembersToCreate)
        .select();
      
      if (error) {
        console.error('❌ Erreur création membres:', error);
        throw error;
      } else {
        createdCount = teamMembersToCreate.length;
        console.log(`✅ ${createdCount} membres d'équipe créés:`, data?.map(m => `${m.prenom} ${m.nom}`));
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${createdCount} membres d'équipe créés automatiquement`,
      origines_found: Array.from(origines),
      members_created: teamMembersToCreate,
      created_count: createdCount
    });

  } catch (error) {
    console.error('❌ Erreur création équipe depuis origines:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}