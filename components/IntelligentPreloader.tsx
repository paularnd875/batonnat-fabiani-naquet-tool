'use client';

import { useEffect, useState } from 'react';

interface PreloadStatus {
  cacheWarmed: boolean;
  dataPreloaded: boolean;
  estimatedDataSize: string;
  preloadTime: number;
  error?: string;
}

/**
 * 🚀 SYSTÈME DE PRÉ-CHARGEMENT INTELLIGENT
 * 
 * Ce composant s'active discrètement en arrière-plan pour :
 * 1. Réchauffer le cache Google Sheets (évite les 18+ secondes d'attente)
 * 2. Précharger les statistiques essentielles
 * 3. Optimiser l'expérience utilisateur en anticipant les besoins
 */
export default function IntelligentPreloader() {
  const [status, setStatus] = useState<PreloadStatus>({
    cacheWarmed: false,
    dataPreloaded: false,
    estimatedDataSize: '0 MB',
    preloadTime: 0
  });

  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Démarrer le pré-chargement intelligent après un petit délai pour ne pas bloquer l'affichage initial
    const preloadTimer = setTimeout(() => {
      startIntelligentPreload();
    }, 2000); // 2 secondes pour laisser la page s'afficher

    return () => clearTimeout(preloadTimer);
  }, []);

  const startIntelligentPreload = async () => {
    setIsPreloading(true);
    setProgress(10);
    const startTime = Date.now();

    try {
      console.log(' PRÉCHARGEMENT INTELLIGENT: Démarrage...');
      
      // ÉTAPE 1: Vérifier l'état du cache
      setProgress(20);
      const cacheResponse = await fetch('/api/warm-cache', { method: 'GET' });
      const cacheStatus = await cacheResponse.json();
      
      if (!cacheStatus.cacheStatus?.lawyersInCache) {
        console.log(' CACHE VIDE - Démarrage du réchauffage...');
        setProgress(30);
        
        // ÉTAPE 2: Réchauffer le cache Google Sheets en arrière-plan
        const warmResponse = await fetch('/api/warm-cache', { method: 'POST' });
        const warmResult = await warmResponse.json();
        
        setProgress(70);
        
        if (warmResult.success) {
          console.log(` CACHE RÉCHAUFFÉ: ${warmResult.lawyerCount} avocats en ${warmResult.duration}ms`);
          setStatus(prev => ({ 
            ...prev, 
            cacheWarmed: true,
            estimatedDataSize: `${Math.round(warmResult.lawyerCount * 0.002)} MB` // Estimation
          }));
        }
      } else {
        console.log(' CACHE DÉJÀ CHAUD - Pas de réchauffage nécessaire');
        setStatus(prev => ({ 
          ...prev, 
          cacheWarmed: true,
          estimatedDataSize: `${Math.round(cacheStatus.cacheStatus.lawyerCount * 0.002)} MB`
        }));
        setProgress(70);
      }

      // ÉTAPE 3: Précharger les statistiques des cabinets (optionnel - seulement si le cache est chaud)
      if (status.cacheWarmed || cacheStatus.cacheStatus?.lawyersInCache) {
        setProgress(80);
        try {
          const firmsResponse = await fetch('/api/firms-live');
          const firmsData = await firmsResponse.json();
          
          if (firmsData.success) {
            console.log(` STATISTIQUES PRÉCHARGÉES: ${firmsData.firms?.length || 0} cabinets`);
            setStatus(prev => ({ ...prev, dataPreloaded: true }));
          }
        } catch (error) {
          console.warn(' Échec préchargement statistiques (non critique):', error);
        }
      }

      setProgress(100);
      const totalTime = Date.now() - startTime;
      setStatus(prev => ({ ...prev, preloadTime: totalTime }));
      
      console.log(` PRÉCHARGEMENT TERMINÉ en ${totalTime}ms`);

    } catch (error) {
      console.error(' ERREUR PRÉCHARGEMENT:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }));
    } finally {
      setIsPreloading(false);
      // Masquer la barre de progression après un petit délai
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Interface utilisateur minimaliste - seulement visible pendant le chargement
  if (!isPreloading && progress === 0) {
    return null; // Composant invisible une fois terminé
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Barre de progression discrète */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Indicateur de statut (optionnel - seulement si en cours) */}
      {isPreloading && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 text-xs text-gray-600 flex items-center gap-2">
          <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
          <span>Optimisation en cours... {progress}%</span>
          {status.cacheWarmed && (
            <span className="text-green-600">• Cache OK</span>
          )}
          {status.dataPreloaded && (
            <span className="text-green-600">• Données OK</span>
          )}
        </div>
      )}
    </div>
  );
}

// Hook personnalisé pour utiliser le statut du préchargement
export function usePreloadStatus() {
  const [status, setStatus] = useState<PreloadStatus | null>(null);

  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        const response = await fetch('/api/warm-cache');
        const data = await response.json();
        
        setStatus({
          cacheWarmed: !!data.cacheStatus?.lawyersInCache,
          dataPreloaded: true,
          estimatedDataSize: data.cacheStatus?.lawyerCount ? 
            `${Math.round(data.cacheStatus.lawyerCount * 0.002)} MB` : '0 MB',
          preloadTime: 0
        });
      } catch (error) {
        console.warn('Impossible de vérifier le statut du cache:', error);
      }
    };

    checkCacheStatus();
  }, []);

  return status;
}