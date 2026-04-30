'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const FabianiNaquetHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { text: 'MANIFESTE', href: '#manifeste' },
    { text: 'CANDIDATS', href: '#candidats' },
    { text: 'SOUTIENS', href: '/soutiens' },
    { text: 'CONTACT', href: '#contact' },
  ];

  return (
    <>
      {/* Header principal avec style Mondrian */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white border-b-[3px] border-black">
        <div className="flex items-stretch justify-between h-[78px] pl-12 pr-0">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center font-bold text-[1.1rem] text-black no-underline tracking-[0.02em] uppercase"
            style={{ fontFamily: "'Resolve Sans', 'Inter', sans-serif" }}
          >
            FABIANI & NAQUET
          </Link>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-stretch h-full">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="flex items-center px-[1.2rem] text-[0.8rem] font-medium text-black no-underline tracking-[0.05em] uppercase transition-all duration-200 hover:bg-[#FFD700] hover:shadow-[inset_3px_0_0_black,inset_-3px_0_0_black]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {link.text}
              </Link>
            ))}
          </div>

          {/* Burger menu pour mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col justify-center gap-[5px] p-2 mr-4"
            aria-label="Menu"
          >
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block h-[2px] w-6 bg-black transition-all duration-300 ${mobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
          </button>
        </div>

        {/* Bande de couleurs Mondrian sous le header */}
        <div className="flex h-1">
          <div className="flex-1 bg-[#4A90E2]"></div>
          <div className="flex-1 bg-white"></div>
          <div className="flex-1 bg-[#FFD700]"></div>
          <div className="flex-1 bg-[#E74C3C]"></div>
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
              className="text-2xl font-bold text-black uppercase tracking-wider hover:text-[#4A90E2] transition-colors"
            >
              {link.text}
            </Link>
          ))}
        </div>
      </div>

      {/* Spacer pour compenser le header fixe */}
      <div className="h-[82px]"></div>
    </>
  );
};

export default FabianiNaquetHeader;