'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Loader2, AlertTriangle, Target, Award, Shield, User } from 'lucide-react';

interface StatusButtonProps {
  currentStatus: string;
  lawyerData: {
    prenomnom: string;
    nom: string;
    prenom: string;
    email: string;
    cabinet: string;
  };
  onStatusChange?: (oldStatus: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
}

const StatusButton: React.FC<StatusButtonProps> = ({ 
  currentStatus, 
  lawyerData, 
  onStatusChange,
  disabled = false
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string | null>(null);

  // Configuration des statuts disponibles
  const statusOptions = [
    { 
      value: 'C1', 
      label: 'C1', 
      color: 'bg-green-100 text-green-800',
      icon: Award,
      description: 'Cible prioritaire 1'
    },
    { 
      value: 'C2', 
      label: 'C2', 
      color: 'bg-blue-100 text-blue-800',
      icon: Target,
      description: 'Cible prioritaire 2'
    },
    { 
      value: 'C3', 
      label: 'C3', 
      color: 'bg-yellow-100 text-yellow-800',
      icon: Shield,
      description: 'Cible prioritaire 3'
    },
    { 
      value: 'Blacklist', 
      label: 'Blacklist', 
      color: 'bg-red-100 text-red-800',
      icon: AlertTriangle,
      description: 'Liste noire'
    }
  ];

  const getStatusConfig = (status: string) => {
    const config = statusOptions.find(opt => opt.value === status);
    if (config) return config;
    
    // Statut par défaut pour les statuts non classifiés
    return {
      value: '',
      label: 'Non classifié',
      color: 'bg-gray-100 text-gray-600',
      icon: User,
      description: 'Aucun statut assigné'
    };
  };

  const currentConfig = getStatusConfig(currentStatus);
  const IconComponent = currentConfig.icon;

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange || newStatus === currentStatus || isChanging) return;
    
    setSelectedNewStatus(newStatus);
    setIsChanging(true);

    try {
      await onStatusChange(currentStatus, newStatus);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    } finally {
      setIsChanging(false);
      setSelectedNewStatus(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`whitespace-nowrap focus-ring transition-all duration-200 ${currentConfig.color} border-2`}
          disabled={disabled || isChanging}
        >
          {isChanging ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Modification...
            </>
          ) : (
            <>
              <IconComponent className="w-3 h-3 mr-1" />
              {currentConfig.label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {statusOptions.map((option) => {
          const OptionIcon = option.icon;
          const isSelected = option.value === currentStatus;
          const isBeingSelected = selectedNewStatus === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isSelected || isChanging}
              className={`cursor-pointer transition-colors ${
                isSelected 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`p-1 rounded ${option.color}`}>
                  {isBeingSelected ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <OptionIcon className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
                {isSelected && (
                  <span className="text-xs text-gray-400">●</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
        
        {/* Option de désassignation si l'avocat a un statut */}
        {currentStatus && currentStatus !== 'Non classifié' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusChange('')}
              disabled={isChanging}
              className="cursor-pointer hover:bg-red-50 text-red-600"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="p-1 rounded bg-red-100">
                  {selectedNewStatus === '' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Désassigner</div>
                  <div className="text-xs text-red-400">Retirer le statut</div>
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusButton;