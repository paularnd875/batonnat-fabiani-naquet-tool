/**
 * Script pour nettoyer toutes les données de test
 * - Vide la base SQLite locale
 * - Crée un script pour nettoyer localStorage côté client
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des données de test...');

// 1. Nettoyer la base SQLite locale
const dbPath = path.join(__dirname, 'local.db');
if (fs.existsSync(dbPath)) {
  try {
    const db = new Database(dbPath);
    
    // Vider toutes les tables
    const tables = ['status_changes', 'assignments', 'team_members', 'users'];
    
    for (const table of tables) {
      try {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        console.log(`✅ Table ${table} vidée (${result.changes} entrées supprimées)`);
      } catch (error) {
        console.log(`ℹ️ Table ${table} n'existe pas ou déjà vide`);
      }
    }
    
    // Réinitialiser les séquences
    try {
      db.prepare(`DELETE FROM sqlite_sequence`).run();
      console.log('✅ Séquences réinitialisées');
    } catch (error) {
      console.log('ℹ️ Pas de séquences à réinitialiser');
    }
    
    db.close();
    console.log('✅ Base de données SQLite nettoyée');
  } catch (error) {
    console.error('❌ Erreur nettoyage SQLite:', error.message);
  }
} else {
  console.log('ℹ️ Pas de base SQLite locale à nettoyer');
}

// 2. Créer un script de nettoyage localStorage
const cleanupScript = `
// Script de nettoyage localStorage pour le navigateur
console.log('🧹 Nettoyage localStorage...');

// Supprimer toutes les clés liées à l'application
const keysToRemove = [
  'fn-status-changes',
  'fn-current-statuses'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log('✅ Clé supprimée:', key);
  }
});

console.log('✅ localStorage nettoyé');
console.log('🔄 Rechargement de la page...');
location.reload();
`;

fs.writeFileSync(path.join(__dirname, 'public', 'cleanup-localstorage.js'), cleanupScript);
console.log('✅ Script de nettoyage localStorage créé: /public/cleanup-localstorage.js');

console.log('');
console.log('📋 Instructions pour finaliser le nettoyage:');
console.log('1. Ouvrir https://batonnat-fabiani-naquet-tool.vercel.app');
console.log('2. Ouvrir la console développeur (F12)');
console.log('3. Coller et exécuter le script de nettoyage localStorage');
console.log('4. Ou aller sur: https://batonnat-fabiani-naquet-tool.vercel.app/cleanup-localstorage.js');
console.log('');
console.log('🚀 Après nettoyage, le site sera prêt pour le client');