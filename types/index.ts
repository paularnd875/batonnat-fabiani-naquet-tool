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
  team_members: TeamMember;
}

export interface BaseLawyer {
  prenomnom: string;
  civilite: string;
  nom_complet: string;
  telephone: string;
  email: string;
  annee_serment: number;
  cabinet?: string;
  classement: string;
  origine: string;
  soutien_public: boolean;
  soutiens_precedents: string[];
  ami_linkedin_mhf: boolean;
  ami_linkedin_fn: boolean;
  photo_url?: string;
  assignments?: Assignment[];
}

export type Lawyer = BaseLawyer;