/**
 * Script de test pour vérifier la cohérence des chiffres
 * entre dashboard (/api/firms-live) et cabinet (/api/cabinet/[name])
 */

const puppeteer = require('puppeteer-core');

async function testCoherence() {
  console.log('🧪 Test de cohérence des chiffres Dashboard vs Cabinet');
  console.log('🚀 Démarrage du navigateur...');
  
  let browser;
  try {
    // Essayer Chrome puis Chromium
    try {
      browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (error) {
      console.log('Chrome non trouvé, essai avec Chromium...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    
    // 1. Aller sur la page d'accueil et récupérer les stats dashboard
    console.log('📊 Test 1: Récupération stats dashboard...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Attendre et cliquer sur le bouton "Liste des cabinets"
    await page.waitForSelector('button:has-text("Afficher la liste des cabinets")', { timeout: 10000 });
    await page.click('button:has-text("Afficher la liste des cabinets")');
    
    // Attendre que la liste se charge
    await page.waitForSelector('[data-testid="firm-stats"]', { timeout: 10000 });
    
    // Rechercher "Avocats en individuel"
    const dashboardStats = await page.evaluate(() => {
      const firmRows = Array.from(document.querySelectorAll('[data-testid="firm-stats"]'));
      const individualsRow = firmRows.find(row => 
        row.textContent.includes('Avocats en individuel')
      );
      
      if (!individualsRow) return null;
      
      const text = individualsRow.textContent;
      const c1Match = text.match(/C1:\s*(\d+)/);
      const c2Match = text.match(/C2:\s*(\d+)/);  
      const c3Match = text.match(/C3:\s*(\d+)/);
      const spMatch = text.match(/SP:\s*(\d+)/);
      
      return {
        c1: c1Match ? parseInt(c1Match[1]) : 0,
        c2: c2Match ? parseInt(c2Match[1]) : 0,
        c3: c3Match ? parseInt(c3Match[1]) : 0,
        sp: spMatch ? parseInt(spMatch[1]) : 0,
      };
    });

    console.log('📈 Stats Dashboard "Avocats en individuel":', dashboardStats);
    
    // 2. Aller sur la page cabinet et récupérer les stats
    console.log('📊 Test 2: Récupération stats page cabinet...');
    await page.goto('http://localhost:3001/cabinet/Avocats%20en%20individuel', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Attendre que les stats se chargent
    await page.waitForSelector('.text-sm.text-gray-600', { timeout: 10000 });
    
    const cabinetStats = await page.evaluate(() => {
      const statsElements = Array.from(document.querySelectorAll('.text-sm.text-gray-600'));
      const stats = {};
      
      statsElements.forEach(el => {
        const text = el.textContent;
        if (text.includes('Soutiens publics:')) {
          const match = text.match(/Soutiens publics:\s*(\d+)/);
          stats.sp = match ? parseInt(match[1]) : 0;
        } else if (text.includes('C1:')) {
          const match = text.match(/C1:\s*(\d+)/);
          stats.c1 = match ? parseInt(match[1]) : 0;
        } else if (text.includes('C2:')) {
          const match = text.match(/C2:\s*(\d+)/);
          stats.c2 = match ? parseInt(match[1]) : 0;
        } else if (text.includes('C3:')) {
          const match = text.match(/C3:\s*(\d+)/);
          stats.c3 = match ? parseInt(match[1]) : 0;
        }
      });
      
      return stats;
    });

    console.log('📈 Stats Cabinet "Avocats en individuel":', cabinetStats);
    
    // 3. Comparer les résultats
    console.log('\n🔍 COMPARAISON:');
    const fields = ['c1', 'c2', 'c3', 'sp'];
    let allMatch = true;
    
    fields.forEach(field => {
      const dashVal = dashboardStats?.[field] || 0;
      const cabVal = cabinetStats?.[field] || 0;
      const match = dashVal === cabVal;
      allMatch = allMatch && match;
      
      console.log(`${field.toUpperCase()}: Dashboard=${dashVal}, Cabinet=${cabVal} ${match ? '✅' : '❌'}`);
    });
    
    if (allMatch) {
      console.log('\n🎉 SUCCÈS: Tous les chiffres concordent!');
    } else {
      console.log('\n⚠️ ÉCHEC: Des chiffres ne concordent pas.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Lancer le test
testCoherence();