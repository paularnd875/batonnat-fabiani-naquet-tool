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
  nom?: string; // Nom séparé (extrait de nom_complet)
  prenom?: string; // Prénom séparé (extrait de nom_complet)
  telephone: string;
  email: string;
  annee_serment: number;
  cabinet?: string; // Raison sociale (clé technique de regroupement/routing)
  cabinet_nom_commercial?: string; // Nom commercial (source)
  cabinet_display?: string; // Nom à AFFICHER = nom commercial || raison sociale
  statut_cabinet?: string; // Nouveau champ pour associé/collaborateur/etc (colonne AH)
  classement: string;
  origine: string;
  soutien_public: boolean;
  // Conformité : plus de soutiens de campagnes précédentes (toujours vide, conservé pour compat).
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  photo_url?: string;
  // Champs profil supplémentaires (source : base)
  xp?: string;
  specialite?: string;
  mandat?: string;
  langue?: string;
  nationalite?: string;
  tranche_taille_cabinet?: string;
  // Cercles / réseaux (source : MHF)
  cercles?: string[];
  // Élus 2026 (source : base)
  elus_statut?: string;
  elus_certitude?: string;
  // Données de vote du Barreau de Paris 2024 (déprécié / non collecté — conservé dormant)
  premier_tour_vote?: boolean;
  second_tour_vote?: boolean;
  assignments?: Assignment[];
}

// Props pour composants - signature unifiée
export interface LawyerCardProps {
  lawyer: Lawyer;
  onAssign: (lawyer: Lawyer, memberId: string) => Promise<void>;
  // teamMemberId optionnel : si fourni, ne retire QUE ce soutien ; sinon, tous.
  onUnassign?: (lawyer: Lawyer, teamMemberId?: string) => Promise<void>;
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
  onAssign: (lawyer: Lawyer, memberId: string) => Promise<void>;
  teamMembers: TeamMember[];
}