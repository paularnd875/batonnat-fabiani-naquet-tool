'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatusChangeNotification from './StatusChangeNotification';

const FabianiNaquetHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();

  // Récupérer les informations utilisateur depuis les cookies
  useEffect(() => {
    const getUserInfo = () => {
      try {
        const cookies = document.cookie.split(';');
        const userInfoCookie = cookies.find(cookie => 
          cookie.trim().startsWith('user-info=')
        );
        
        if (userInfoCookie) {
          const userInfoValue = userInfoCookie.split('=')[1];
          const userInfo = JSON.parse(decodeURIComponent(userInfoValue));
          setUserInfo(userInfo);
        }
      } catch (error) {
        console.error('Erreur lors de la lecture des infos utilisateur:', error);
      }
    };

    getUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const navLinks = [
    { text: 'CABINETS', href: '/' },
    { text: 'AVOCATS', href: '/avocats' },
    { text: 'AJOUT C123', href: '/typeform-ajout-c123' },
    { text: 'TABLEAU DE BORD', href: '/dashboard' },
  ];

  return (
    <>
      {/* Header principal avec style Mondrian Fabiani-Naquet */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white border-b-[3px] border-black">
        <div className="flex items-stretch justify-between h-[78px] pl-8 pr-0">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center font-bold text-[1.1rem] text-black no-underline tracking-[0.02em] uppercase focus-ring"
            style={{ fontFamily: "var(--font-resolve)" }}
          >
            BÂTONNAT FABIANI-NAQUET 2026
          </Link>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-stretch h-full">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="flex items-center px-[1.2rem] text-[0.8rem] font-medium text-black no-underline tracking-[0.05em] uppercase transition-all duration-200 hover:bg-[#FFD700] hover:shadow-[inset_3px_0_0_black,inset_-3px_0_0_black]"
                style={{ fontFamily: "var(--font-resolve)" }}
              >
                {link.text}
              </Link>
            ))}
            
            {/* Bouton de déconnexion */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center px-[1.2rem] text-[0.8rem] font-medium text-red-600 no-underline tracking-[0.05em] uppercase transition-all duration-200 hover:bg-red-50 hover:shadow-[inset_3px_0_0_red,inset_-3px_0_0_red]"
              style={{ fontFamily: "var(--font-resolve)" }}
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Burger menu pour mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col justify-center gap-[5px] p-2 mr-4 focus-ring icon-hover"
            aria-label="Menu"
          >
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
          </button>
        </div>

        {/* Bande de couleurs Mondrian sous le header */}
        <div className="flex h-1">
          <div className="flex-1" style={{ backgroundColor: 'var(--fn-blue)' }}></div>
          <div className="flex-1 bg-white"></div>
          <div className="flex-1" style={{ backgroundColor: 'var(--fn-yellow)' }}></div>
          <div className="flex-1" style={{ backgroundColor: 'var(--fn-red)' }}></div>
          <div className="flex-1 bg-black"></div>
        </div>
      </nav>

      {/* Menu mobile */}
      <div className={`fixed inset-0 bg-white z-[999] flex items-center justify-center transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col gap-6 text-center">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl sm:text-2xl font-bold text-black uppercase tracking-wider transition-colors focus-ring fn-link"
              style={{ 
                fontFamily: "var(--font-resolve)",
                color: index === 0 ? 'var(--fn-red)' : 
                       index === 1 ? 'var(--fn-blue)' : 
                       index === 2 ? 'var(--fn-yellow)' :
                       index === 3 ? 'var(--fn-red)' :
                       'var(--fn-black)'
              }}
            >
              {link.text}
            </Link>
          ))}
          
          {/* Bouton de déconnexion mobile */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center justify-center text-lg sm:text-2xl font-bold text-red-600 uppercase tracking-wider transition-colors focus-ring mt-4"
            style={{ fontFamily: "var(--font-resolve)" }}
            title="Se déconnecter"
          >
            <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      {/* Spacer pour compenser le header fixe */}
      <div className="h-[82px]"></div>

      {/* Notification de changements de statut pour Paul */}
      {userInfo && (
        <StatusChangeNotification userInfo={userInfo} />
      )}
    </>
  );
};

export default FabianiNaquetHeader;