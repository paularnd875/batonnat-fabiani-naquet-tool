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
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Boîte aux lettres minimaliste */}
      <rect x="3" y="14" width="18" height="7" rx="1" />
      
      {/* Fente d'insertion */}
      <line x1="6" y1="14" x2="18" y2="14" strokeWidth="1" />
      
      {/* Enveloppe qui s'insère */}
      <polygon 
        points="7,8 17,8 17,12 12,10 7,12" 
        fill={voted ? color : 'none'} 
        opacity={voted ? "0.6" : "1"}
        strokeWidth="1.5"
      />
      
      {/* Rabat central de l'enveloppe */}
      <path d="M7 8L12 11L17 8" strokeWidth="1.5" />
    </svg>
  );
}