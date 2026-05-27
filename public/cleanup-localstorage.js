
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
