#!/usr/bin/env node

/**
 * Script de réchauffement automatique du cache au démarrage de l'application
 * 🚀 OPTIMISATION: Précharge Google Sheets pour éviter les 60+ secondes d'attente
 */

const serverUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

async function warmUpCache() {
  console.log('🔥 Starting TURBO cache warm-up...');
  
  try {
    // 1. Préchauffer les données lawyers
    console.log('🔥 Step 1: Preloading lawyers data...');
    const lawyersResponse = await fetch(`${serverUrl}/api/warm-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const lawyersResult = await lawyersResponse.json();
    
    if (lawyersResult.success) {
      console.log(`✅ Lawyers cache warm-up: ${lawyersResult.duration}ms - ${lawyersResult.lawyerCount} lawyers`);
    }

    // 2. Préchauffer les statistiques firms
    console.log('🔥 Step 2: Preloading firms stats...');
    const firmsResponse = await fetch(`${serverUrl}/api/firms-live`);
    const firmsResult = await firmsResponse.json();
    
    if (firmsResult.success) {
      console.log(`✅ Firms cache warm-up: ${firmsResult.firms?.length || 0} firms cached`);
    }

    // 3. Préchauffer les gros cabinets critiques
    const bigCabinets = [
      'Avocats%20en%20individuel',
      'GIDE%20LOYRETTE%20NOUEL%20AARPI',
      'BREDIN%20PRAT'
    ];

    console.log('🔥 Step 3: Preloading big cabinets stats...');
    for (const cabinet of bigCabinets) {
      try {
        const cabinetResponse = await fetch(`${serverUrl}/api/cabinet/${cabinet}?limit=1`);
        const cabinetResult = await cabinetResponse.json();
        if (cabinetResult.success) {
          console.log(`✅ Cabinet ${decodeURIComponent(cabinet)}: ${cabinetResult.cabinet?.stats?.lawyer_count || 0} lawyers cached`);
        }
      } catch (error) {
        console.log(`⚠️ Cabinet ${decodeURIComponent(cabinet)}: skipped (${error.message})`);
      }
    }

    console.log('🚀 TURBO cache warm-up completed!');
    
  } catch (error) {
    console.error('❌ Cache warm-up error:', error.message);
  }
}

// Auto-start if called directly
if (require.main === module) {
  warmUpCache();
}

module.exports = { warmUpCache };