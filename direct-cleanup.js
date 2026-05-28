/**
 * Nettoyage direct via l'API Vercel production
 */

async function cleanupVercelDirect() {
  console.log('🧹 Nettoyage direct Vercel en cours...');
  
  try {
    // Faire appel à l'API de nettoyage sur Vercel
    const response = await fetch('https://batonnat-fabiani-naquet-tool.vercel.app/api/cleanup-vercel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Nettoyage réussi:');
      result.actions.forEach(action => console.log(`  ${action}`));
      console.log(`🕐 Timestamp: ${result.timestamp}`);
      console.log(`📊 Status: ${result.status}`);
    } else {
      console.error('❌ Erreur:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Erreur lors du nettoyage:', error.message);
  }
}

// Exporter pour utilisation en Node.js si nécessaire
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cleanupVercelDirect };
} else {
  // Exécution directe
  cleanupVercelDirect();
}