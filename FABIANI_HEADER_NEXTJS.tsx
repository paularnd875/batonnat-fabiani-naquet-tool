'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NavItem {
  text: string;
  href: string;
}

const FabianiNaquetHeader: React.FC = () => {
  const navItems: NavItem[] = [
    { text: "FABIANI & NAQUET", href: "https://www.fabiani-naquet.paris/" },
    { text: "MANIFESTE", href: "https://www.fabiani-naquet.paris/#manifeste" },
    { text: "CANDIDATS", href: "https://www.fabiani-naquet.paris/#candidats" },
    { text: "SOUTIENS", href: "https://www.fabiani-naquet.paris/soutiens" },
    { text: "CONTACT", href: "https://www.fabiani-naquet.paris/#contact" },
  ];

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <div className="text-2xl font-bold">Logo</div>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                {item.text}
              </Link>
            ))}
          </nav>
          
          {/* Mobile Menu Button */}
          <button className="md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default FabianiNaquetHeader;
