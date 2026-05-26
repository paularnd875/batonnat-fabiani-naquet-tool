'use client';

import { useState, useEffect } from 'react';

export function useLawyersWithLocalStorage(initialData?: any) {
  const [lawyers, setLawyers] = useState(initialData?.lawyers || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const loadLawyersWithLocalStorage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les statuts localStorage
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      const localStorageStatuses = statusChangesStorage.getCurrentStatuses();

      // Appeler l'API qui fusionne les données
      const response = await fetch('/api/lawyers-with-localstorage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localStorageStatuses
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des avocats');
      }

      const data = await response.json();
      
      if (data.success) {
        setLawyers(data.lawyers);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des avocats avec localStorage:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Charger automatiquement si pas de données initiales
  useEffect(() => {
    if (!initialData) {
      loadLawyersWithLocalStorage();
    } else {
      // Si on a des données initiales, les fusionner avec localStorage
      const fusionWithLocalStorage = async () => {
        try {
          const { statusChangesStorage } = await import('@/lib/status-changes-storage');
          const localStorageStatuses = statusChangesStorage.getCurrentStatuses();
          
          const fusedLawyers = initialData.lawyers.map((lawyer: any) => {
            const localStatus = localStorageStatuses[lawyer.prenomnom];
            if (localStatus !== undefined && localStatus !== null) {
              return {
                ...lawyer,
                classement: localStatus
              };
            }
            return lawyer;
          });
          
          setLawyers(fusedLawyers);
        } catch (error) {
          console.warn('Erreur fusion localStorage:', error);
          setLawyers(initialData.lawyers);
        }
      };
      
      fusionWithLocalStorage();
    }
  }, [initialData]);

  return {
    lawyers,
    loading,
    error,
    refetch: loadLawyersWithLocalStorage
  };
}

export function useCabinetWithLocalStorage(cabinetName: string, initialData?: any) {
  const [cabinet, setCabinet] = useState(initialData?.cabinet || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const loadCabinetWithLocalStorage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les statuts localStorage
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      const localStorageStatuses = statusChangesStorage.getCurrentStatuses();

      // Appeler l'API qui fusionne les données
      const response = await fetch(`/api/cabinet-with-localstorage/${encodeURIComponent(cabinetName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localStorageStatuses
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du cabinet');
      }

      const data = await response.json();
      
      if (data.success) {
        setCabinet(data.cabinet);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur lors du chargement du cabinet avec localStorage:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Charger automatiquement si pas de données initiales
  useEffect(() => {
    if (!initialData) {
      loadCabinetWithLocalStorage();
    } else {
      // Si on a des données initiales, les fusionner avec localStorage
      const fusionWithLocalStorage = async () => {
        try {
          const { statusChangesStorage } = await import('@/lib/status-changes-storage');
          const localStorageStatuses = statusChangesStorage.getCurrentStatuses();
          
          const fusedLawyers = initialData.cabinet.lawyers.map((lawyer: any) => {
            const localStatus = localStorageStatuses[lawyer.prenomnom];
            if (localStatus !== undefined && localStatus !== null) {
              return {
                ...lawyer,
                classement: localStatus
              };
            }
            return lawyer;
          });
          
          // Recalculer les stats
          const stats = {
            ...initialData.cabinet.stats,
            c1_count: 0,
            c2_count: 0,
            c3_count: 0,
            bl_count: 0,
            unclassified_count: 0
          };
          
          fusedLawyers.forEach((lawyer: any) => {
            switch (lawyer.classement) {
              case 'C1': stats.c1_count++; break;
              case 'C2': stats.c2_count++; break;
              case 'C3': stats.c3_count++; break;
              case 'Blacklist': stats.bl_count++; break;
              default: stats.unclassified_count++; break;
            }
          });
          
          setCabinet({
            ...initialData.cabinet,
            lawyers: fusedLawyers,
            stats
          });
        } catch (error) {
          console.warn('Erreur fusion localStorage cabinet:', error);
          setCabinet(initialData.cabinet);
        }
      };
      
      fusionWithLocalStorage();
    }
  }, [initialData, cabinetName]);

  return {
    cabinet,
    loading,
    error,
    refetch: loadCabinetWithLocalStorage
  };
}