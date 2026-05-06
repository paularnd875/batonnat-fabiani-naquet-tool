// Types unifiés pour toute l'application
export interface TeamMember {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
}

export interface Assignment {
  id: string;
  team_member_id: string;
  assigned_at: string;
  team_members: {
    id: string;
    prenom: string;
    nom: string;
    email?: string;
  };
}

// Interface Lawyer unifiée - SEULE source de vérité
export interface Lawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  cabinet?: string;
  statut_cabinet?: string; // Nouveau champ pour associé/collaborateur/etc (colonne AH)
  classement: string;
  origine: string;
  soutien_public: boolean;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  photo_url?: string;
  // Données de vote du Barreau de Paris 2024
  premier_tour_vote?: boolean;
  second_tour_vote?: boolean;
  assignments?: Assignment[];
}

// Props pour composants - signature unifiée
export interface LawyerCardProps {
  lawyer: Lawyer;
  onAssign: (lawyer: Lawyer, memberId: string) => void;
  teamMembers: TeamMember[];
}

// Interface pour wrapper de fonction d'assignation
export interface AssignFunction {
  (lawyerPrenomnom: string, teamMemberId: string): Promise<void>;
}

export interface AssignWrapperFunction {
  (lawyer: Lawyer, teamMemberId: string): void;
}

export interface VirtualizedLawyerListProps {
  lawyers: Lawyer[];
  onAssign: (lawyer: Lawyer, memberId: string) => void;
  teamMembers: TeamMember[];
}