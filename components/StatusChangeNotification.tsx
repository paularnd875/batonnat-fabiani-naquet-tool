'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, Database, X } from 'lucide-react';
import Link from 'next/link';

interface NotificationProps {
  userInfo: any;
}

const StatusChangeNotification: React.FC<NotificationProps> = ({ userInfo }) => {
  const [unexportedCount, setUnexportedCount] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Vérifier si l'utilisateur est Paul (basé sur le prénom)
  const isPaul = userInfo?.prenom?.toLowerCase() === 'paul';
  

  // Fonction de téléchargement CSV
  const handleDownloadCSV = async () => {
    try {
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      statusChangesStorage.downloadCSV();
      
      // Actualiser le compteur après téléchargement (les changements sont marqués comme exportés)
      setTimeout(() => {
        fetchUnexportedCount();
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du téléchargement CSV:', error);
      alert('Erreur lors du téléchargement du CSV');
    }
  };

  useEffect(() => {
    if (!isPaul) {
      setLoading(false);
      return;
    }

    fetchUnexportedCount();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchUnexportedCount, 30000);
    
    return () => clearInterval(interval);
  }, [isPaul]);

  const fetchUnexportedCount = async () => {
    if (!isPaul) return;

    try {
      // Import dynamique pour éviter les problèmes SSR
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      
      const unexportedChanges = statusChangesStorage.getUnexportedChanges();
      const count = unexportedChanges.length;
      
      setUnexportedCount(count);
    } catch (error) {
      console.error(' Erreur lors du chargement du localStorage:', error);
    } finally {
      setLoading(false);
    }
  };


  // Ne rien afficher si ce n'est pas Paul ou si aucun changement n'est en attente
  if (!isPaul || unexportedCount === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-24 right-4 z-[900] max-w-xs">
      <div className="bg-fn-yellow border-2 border-black rounded-lg p-3 shadow-lg scale-85">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-full border-2 border-black">
              <Database className="w-4 h-4 text-fn-red" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-fn-black text-sm uppercase tracking-wider" style={{ fontFamily: "var(--font-resolve)" }}>
                  CHANGEMENTS EN ATTENTE
                </h3>
                <Badge className="bg-fn-red text-white border-black font-bold">
                  {unexportedCount}
                </Badge>
              </div>
              <p className="text-xs text-fn-black mb-2">
                {unexportedCount} changement{unexportedCount > 1 ? 's' : ''} de statut à exporter
              </p>
              <div className="flex gap-2">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-bold text-fn-blue hover:underline uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-resolve)" }}
                >
                  <Bell className="w-3 h-3" />
                  Dashboard
                </Link>
                <button
                  onClick={handleDownloadCSV}
                  className="inline-flex items-center gap-1 text-xs font-bold text-fn-red hover:underline uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-resolve)" }}
                >
                  📥 Télécharger CSV
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-black hover:text-white rounded transition-colors"
            title="Masquer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeNotification;