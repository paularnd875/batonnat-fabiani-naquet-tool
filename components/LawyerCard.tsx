import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Mail, Phone, AlertTriangle, User } from 'lucide-react';

interface Lawyer {
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
  assignments?: {
    id: string;
    team_member_id: string;
    assigned_at: string;
    team_members: {
      id: string;
      prenom: string;
      nom: string;
      email?: string;
    };
  }[];
}

interface LawyerCardProps {
  lawyer: Lawyer;
  onAssign: (lawyer: Lawyer, memberId: string) => void;
  teamMembers: Array<{ id: string; prenom: string; nom: string }>;
}

const LawyerCard: React.FC<LawyerCardProps> = React.memo(({ lawyer, onAssign, teamMembers }) => {
  const getClassementColor = (classement: string) => {
    switch (classement) {
      case 'C1': return 'bg-green-100 text-green-800';
      case 'C2': return 'bg-blue-100 text-blue-800';
      case 'C3': return 'bg-yellow-100 text-yellow-800';
      case 'Blacklist': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-300 relative">
          {lawyer.photo_url ? (
            <Image 
              src={lawyer.photo_url}
              alt={`Photo de ${lawyer.nom_complet}`}
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-full"
              sizes="96px"
              priority={false}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
                const userIcon = target.parentElement?.querySelector('.user-fallback');
                if (userIcon) {
                  userIcon.classList.remove('hidden');
                }
              }}
            />
          ) : null}
          <User className={`w-8 h-8 text-gray-500 user-fallback absolute inset-0 m-auto ${lawyer.photo_url ? 'hidden' : ''}`} />
        </div>

        <div className="flex-1 min-w-0 flex justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {lawyer.nom_complet}
              </h3>
              <p className="text-sm text-gray-600">{lawyer.civilite}</p>
            </div>

            <div className="space-y-1">
              {lawyer.telephone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <a 
                    href={`tel:${lawyer.telephone}`} 
                    className="hover:text-blue-600 transition-colors"
                  >
                    {lawyer.telephone}
                  </a>
                </div>
              )}
              
              {lawyer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <a 
                    href={`mailto:${lawyer.email}`} 
                    className="hover:text-blue-600 transition-colors truncate"
                  >
                    {lawyer.email}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {lawyer.classement && (
                <Badge className={getClassementColor(lawyer.classement)}>
                  {lawyer.classement}
                </Badge>
              )}
              
              {lawyer.soutien_public && (
                <Badge variant="default" className="bg-purple-100 text-purple-800">
                  Soutien public
                </Badge>
              )}
              
              {lawyer.ami_linkedin_mhf && (
                <Badge variant="outline">LinkedIn MHF</Badge>
              )}
              
              {lawyer.ami_linkedin_fn && (
                <Badge variant="outline">LinkedIn FN</Badge>
              )}
            </div>

            {lawyer.soutiens_precedents && lawyer.soutiens_precedents.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Soutiens précédents :</p>
                <div className="flex flex-wrap gap-1">
                  {lawyer.soutiens_precedents.map((soutien, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {soutien}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  Assigner
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {teamMembers.map((member) => (
                  <DropdownMenuItem 
                    key={member.id}
                    onClick={() => onAssign(lawyer, member.id)}
                    className="cursor-pointer"
                  >
                    {member.prenom} {member.nom}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {lawyer.classement === 'Blacklist' && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>Blacklisted</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

LawyerCard.displayName = 'LawyerCard';

export default LawyerCard;