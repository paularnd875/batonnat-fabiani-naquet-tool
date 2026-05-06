import React from 'react';

interface BallotBoxIconProps {
  voted: boolean;
  className?: string;
}

/**
 * Icône minimaliste d'enveloppe s'insérant dans une boîte aux lettres pour indiquer le statut de vote
 * - voted=true : contour vert 
 * - voted=false : contour rouge
 */
export default function BallotBoxIcon({ voted, className = '' }: BallotBoxIconProps) {
  const color = voted ? '#10B981' : '#EF4444'; // emerald-500 : red-500
  
  return (
    <svg 
      width="28" 
      height="28" 
      viewBox="0 0 28 28" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Boîte aux lettres minimaliste */}
      <rect x="4" y="18" width="20" height="7" rx="1" />
      
      {/* Fente d'insertion */}
      <line x1="7" y1="18" x2="21" y2="18" strokeWidth="1" />
      
      {/* Enveloppe qui s'insère */}
      <polygon 
        points="8,6 20,6 20,15 14,12 8,15" 
        fill={voted ? color : 'none'} 
        opacity={voted ? "0.6" : "1"}
        strokeWidth="1.3"
      />
      
      {/* Rabat central de l'enveloppe */}
      <path d="M8 6L14 11L20 6" strokeWidth="1.3" />
    </svg>
  );
}