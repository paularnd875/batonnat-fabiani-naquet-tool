'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';

export default function ResetPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const resetData = async () => {
    setIsResetting(true);
    setLogs([]);
    
    try {
      addLog('🧹 Début du nettoyage...');
      
      // Nettoyer localStorage
      addLog('📱 Nettoyage localStorage...');
      const keysToRemove = [
        'fn-status-changes',
        'fn-current-statuses'
      ];
      
      let removedCount = 0;
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          removedCount++;
          addLog(`✅ Clé supprimée: ${key}`);
        }
      });
      
      if (removedCount === 0) {
        addLog('ℹ️ Aucune donnée de test trouvée dans localStorage');
      }
      
      addLog('🎯 Nettoyage des cookies de session...');
      // Nettoyer les cookies liés aux tests
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        if (name.trim().startsWith('user-info')) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          addLog(`🍪 Cookie supprimé: ${name.trim()}`);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog('✅ Nettoyage terminé avec succès');
      addLog('🚀 Site prêt pour le client');
      
      setIsComplete(true);
      
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    } finally {
      setIsResetting(false);
    }
  };

  const reloadPage = () => {
    addLog('🔄 Rechargement de la page...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🧹 Nettoyage des données de test</h1>
          <p className="text-gray-600">
            Cette page permet de supprimer toutes les données de test avant la livraison client.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Actions effectuées :</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Suppression des changements de statut localStorage</li>
              <li>• Suppression des statuts actuels en cache</li>
              <li>• Nettoyage des cookies de session de test</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button 
              onClick={resetData} 
              disabled={isResetting || isComplete}
              size="lg"
              className="min-w-[200px]"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Nettoyage...
                </>
              ) : isComplete ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Terminé
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nettoyer les données
                </>
              )}
            </Button>

            {isComplete && (
              <Button 
                onClick={reloadPage} 
                variant="outline"
                size="lg"
              >
                Retourner à l'accueil
              </Button>
            )}
          </div>

          {logs.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="font-semibold mb-3">📋 Logs de nettoyage :</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono bg-white px-3 py-1 rounded border">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-800">🎉 Site prêt pour le client !</h3>
              <p className="text-green-700 text-sm mt-1">
                Toutes les données de test ont été supprimées. L'application est maintenant propre.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}