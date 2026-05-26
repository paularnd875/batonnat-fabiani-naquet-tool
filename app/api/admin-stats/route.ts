import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/db';
import { memoryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { getDatabase } from '@/lib/database';

export async function GET(request: Request) {
  try {
    // Récupérer les paramètres de l'URL pour permettre de forcer le recalcul
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // 🚀 OPTIMISATION: Vérifier le cache en premier (sauf si refresh forcé)
    const cachedAdminStats = memoryCache.get(CACHE_KEYS.ADMIN_STATS);
    if (cachedAdminStats && !forceRefresh) {
      console.log('🚀 Statistiques admin chargées depuis le cache (ULTRA RAPIDE!)');
      return NextResponse.json({
        success: true,
        source: 'Cache (Google Sheets + Supabase)',
        ...cachedAdminStats
      });
    }

    console.log('📊 Calcul statistiques admin depuis Google Sheets...');
    const startTime = Date.now();

    // 1. Lire tous les avocats directement depuis Google Sheets (optimisé avec cache)
    const allLawyers = await googleSheets.readLawyers();

    // 2. Calculer les statistiques globales VRAIES
    let globalStats = {
      total_assignments: 0,
      total_assigned_lawyers: 0,
      c1_count: 0,
      c2_count: 0,
      c3_count: 0,
      blacklist_count: 0,
      soutien_public_count: 0,
      total_unassigned: 0,
      total_team_members: 0
    };

    allLawyers.forEach((lawyer: any) => {
      if (lawyer.soutien_public) globalStats.soutien_public_count++;
      
      switch (lawyer.classement) {
        case 'C1': globalStats.c1_count++; break;
        case 'C2': globalStats.c2_count++; break;
        case 'C3': globalStats.c3_count++; break;
        case 'Blacklist': globalStats.blacklist_count++; break;
      }
    });

    // 3. Récupérer les assignations depuis Supabase avec les détails des membres d'équipe
    const { data: assignments } = await supabase
      .from('assignments')
      .select('lawyer_prenomnom, team_member_id')
      .then((result: any) => result);

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*')
      .then((result: any) => result);

    // 4. Calculer la couverture par membre d'équipe
    const teamCoverage: any = {};
    if (teamMembers) {
      // Initialiser tous les membres à 0
      teamMembers.forEach((member: any) => {
        teamCoverage[member.id] = 0;
      });
    }

    if (assignments) {
      globalStats.total_assignments = assignments.length;
      globalStats.total_assigned_lawyers = new Set(assignments.map((a: any) => a.lawyer_prenomnom)).size;
      
      // Compter les assignations par membre d'équipe
      assignments.forEach((assignment: any) => {
        if (assignment.team_member_id && teamCoverage[assignment.team_member_id] !== undefined) {
          teamCoverage[assignment.team_member_id]++;
        }
      });
    }

    if (teamMembers) {
      globalStats.total_team_members = teamMembers.length;
    }

    globalStats.total_unassigned = allLawyers.length - globalStats.total_assigned_lawyers;
    
    // Ajouter le nombre total d'avocats
    const totalLawyers = allLawyers.length;

    // 5. Récupérer les statistiques de logs de changements de statut
    const db = getDatabase();
    const allLogs = db.getAllStatusChangeLogs();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayLogs = allLogs.filter(log => log.changed_at.startsWith(today));
    const unexportedLogs = allLogs.filter(log => !log.exported_at);
    const totalUsers = db.getAllUsers().length;

    const statusLogsStats = {
      totalLogs: allLogs.length,
      todayLogs: todayLogs.length,
      unexportedLogs: unexportedLogs.length,
      usersCount: totalUsers
    };

    console.log('📊 ADMIN STATS (données Google Sheets réelles):');
    console.log(`   Total avocats: ${totalLawyers}`);
    console.log(`   C1: ${globalStats.c1_count}`);
    console.log(`   C2: ${globalStats.c2_count}`);
    console.log(`   C3: ${globalStats.c3_count}`);
    console.log(`   Soutiens publics: ${globalStats.soutien_public_count}`);
    console.log(`   Blacklist: ${globalStats.blacklist_count}`);
    console.log(`   Assignations: ${globalStats.total_assignments}`);
    console.log(`   Avocats assignés: ${globalStats.total_assigned_lawyers}`);
    console.log(`   Non assignés: ${globalStats.total_unassigned}`);

    const processingDuration = Date.now() - startTime;
    console.log(`⚡ Calcul admin terminé en ${processingDuration}ms`);

    // Enrichir les membres d'équipe avec leur nombre d'assignations
    const enrichedTeamMembers = (teamMembers || []).map((member: any) => ({
      ...member,
      assignment_count: teamCoverage[member.id] || 0
    }));

    // 🚀 OPTIMISATION: Mettre en cache le résultat pour 10 minutes
    const result = {
      source: 'Google Sheets + Supabase assignments + Status logs',
      timestamp: new Date().toISOString(),
      stats: {
        ...globalStats,
        total_lawyers: totalLawyers,
        team_coverage: teamCoverage,
        // Ajouter les stats de status logs
        ...statusLogsStats
      },
      team_members: enrichedTeamMembers
    };
    
    memoryCache.set(CACHE_KEYS.ADMIN_STATS, result, CACHE_TTL.STATS);
    console.log(`💾 Statistiques admin de ${totalLawyers} avocats mises en cache pour 10 minutes`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Erreur admin stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}