'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import LawyerCard from './LawyerCard';
import { Lawyer, VirtualizedLawyerListProps } from '@/types';

const ITEM_HEIGHT = 200; // Hauteur estimée d'une carte d'avocat
const CONTAINER_HEIGHT = 600; // Hauteur du conteneur visible
const BUFFER_SIZE = 5; // Nombre d'éléments à garder en buffer

const VirtualizedLawyerList: React.FC<VirtualizedLawyerListProps> = React.memo(({
  lawyers,
  onAssign,
  teamMembers
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    lawyers.length - 1,
    Math.floor((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + BUFFER_SIZE
  );

  const visibleLawyers = useMemo(() => {
    return lawyers.slice(startIndex, endIndex + 1);
  }, [lawyers, startIndex, endIndex]);

  const totalHeight = lawyers.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Si moins de 10 avocats, pas besoin de virtualisation
  if (lawyers.length <= 10) {
    return (
      <div className="grid gap-4">
        {lawyers.map((lawyer) => (
          <LawyerCard 
            key={lawyer.prenomnom}
            lawyer={lawyer}
            onAssign={onAssign}
            teamMembers={teamMembers}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicateur de performance */}
      <div className="text-sm text-gray-500 bg-green-50 p-2 rounded border">
        🚀 Mode optimisé : Affichage {visibleLawyers.length} / {lawyers.length} avocats (Virtual Scrolling)
      </div>

      {/* Liste virtualisée */}
      <div 
        ref={containerRef}
        className="relative overflow-auto border rounded-lg bg-white"
        style={{ height: `${CONTAINER_HEIGHT}px` }}
        onScroll={handleScroll}
      >
        {/* Spacer pour la hauteur totale */}
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Conteneur des éléments visibles */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
            className="space-y-4 p-4"
          >
            {visibleLawyers.map((lawyer, index) => (
              <div
                key={lawyer.prenomnom}
                style={{ 
                  minHeight: `${ITEM_HEIGHT - 16}px` // -16px pour l'espacement
                }}
              >
                <LawyerCard 
                  lawyer={lawyer}
                  onAssign={onAssign}
                  teamMembers={teamMembers}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistiques de scroll */}
      <div className="text-xs text-gray-400 text-center">
        Indices {startIndex} - {endIndex} | Scroll: {Math.round(scrollTop)}px
      </div>
    </div>
  );
});

VirtualizedLawyerList.displayName = 'VirtualizedLawyerList';

export default VirtualizedLawyerList;