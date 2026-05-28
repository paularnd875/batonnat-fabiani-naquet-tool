'use client';

import { useState, useEffect } from 'react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';
import OverviewTab from '@/components/dashboard/OverviewTab';
import TeamTab from '@/components/dashboard/TeamTab';
import StatisticsTab from '@/components/dashboard/StatisticsTab';
import HistoriqueTab from '@/components/dashboard/HistoriqueTab';
import StatusLogsTab from '@/components/dashboard/StatusLogsTab';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState<{prenom: string, nom: string, email: string} | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Récupérer l'utilisateur actuel depuis les cookies
    try {
      const userInfoCookie = document.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith('user-info='));
      
      if (userInfoCookie) {
        const userInfoValue = userInfoCookie.split('=')[1];
        const user = JSON.parse(decodeURIComponent(userInfoValue));
        setCurrentUser(user);
      }
    } catch (error) {
      console.warn('Impossible de récupérer les infos utilisateur:', error);
    }
  }, []);

  // Gérer l'URL avec paramètre de redirection vers l'onglet classifications
  useEffect(() => {
    if (!mounted) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab');
    
    if (targetTab === 'classifications') {
      // Vérifier que Paul a accès
      if (currentUser?.prenom === 'Paul' && currentUser?.nom === 'Arnould') {
        setActiveTab('status-logs');
      }
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [mounted, currentUser]);

  // Filtrer les onglets en fonction de l'utilisateur
  const allTabs = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: '📊',
      component: OverviewTab
    },
    {
      id: 'team',
      label: 'Équipe',
      icon: '🧑‍💼',
      component: TeamTab
    },
    {
      id: 'statistics',
      label: 'Statistiques',
      icon: '📈',
      component: StatisticsTab
    },
    {
      id: 'historique',
      label: 'Historique',
      icon: '📜',
      component: HistoriqueTab
    },
    {
      id: 'status-logs',
      label: 'Classifications',
      icon: '🔄',
      component: StatusLogsTab,
      adminOnly: true // Visible seulement pour Paul
    }
  ];
  
  // Filtrer les onglets selon l'utilisateur
  const tabs = allTabs.filter(tab => {
    // Si l'onglet est admin-only, vérifier que c'est Paul
    if (tab.adminOnly && mounted) {
      return currentUser?.prenom === 'Paul' && currentUser?.nom === 'Arnould';
    }
    return true;
  });

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <FabianiNaquetHeader />
      
      <div className="container mx-auto px-8 py-6">
        {/* En-tête du tableau de bord */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-fn-black mb-2 text-balance" style={{ fontFamily: "var(--font-resolve)" }}>
            TABLEAU DE BORD FABIANI-NAQUET
          </h1>
          <p className="text-xl text-gray-600">
            Administration et suivi de la campagne
          </p>
        </div>

        {/* Système d'onglets avec style Fabiani-Naquet */}
        <div className="mb-8">
          <nav className="flex border-b-2 border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-6 py-4 font-bold text-sm uppercase tracking-wider transition-all duration-200 focus-ring
                  ${activeTab === tab.id 
                    ? 'border-b-3 border-fn-red text-fn-red bg-red-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 icon-hover'
                  }
                `}
                style={{ fontFamily: "var(--font-resolve)" }}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="animate-in fade-in duration-200">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}