/**
 * Script pour nettoyer automatiquement les données de test sur Vercel
 */

const puppeteer = require('puppeteer');

async function cleanupVercel() {
  console.log('🧹 Lancement du nettoyage automatique Vercel...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Aller sur la page de reset
    console.log('📍 Navigation vers la page de reset...');
    await page.goto('https://batonnat-fabiani-naquet-tool.vercel.app/reset', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Attendre que la page soit chargée
    console.log('⏳ Attente du chargement de la page...');
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Cliquer sur le bouton de nettoyage
    console.log('🔘 Clic sur le bouton de nettoyage...');
    await page.click('button:has-text("Nettoyer les données")');
    
    // Attendre que le nettoyage soit terminé
    console.log('⌛ Attente de la fin du nettoyage...');
    await page.waitForSelector('text=Terminé', { timeout: 30000 });
    
    // Vérifier les logs
    const logs = await page.$$eval('.font-mono', elements => 
      elements.map(el => el.textContent)
    );
    
    console.log('📋 Logs de nettoyage:');
    logs.forEach(log => console.log(`  ${log}`));
    
    console.log('✅ Nettoyage Vercel terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Lancer le nettoyage
cleanupVercel()
  .then(() => {
    console.log('🎉 Site Vercel maintenant propre pour le client!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Échec du nettoyage:', error);
    process.exit(1);
  });