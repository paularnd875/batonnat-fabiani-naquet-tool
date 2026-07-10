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
import { Mail, Phone, AlertTriangle, User, Loader2, X } from 'lucide-react';
import { Lawyer, LawyerCardProps } from '@/types';
import BallotBoxIcon from '@/components/ui/BallotBoxIcon';
import StatusButton from '@/components/StatusButton';

type AssignedMember = { id: string; prenom: string; nom: string };

const LawyerCard: React.FC<LawyerCardProps> = React.memo(({ lawyer, onAssign, onUnassign, teamMembers }) => {
  // Liste des soutiens (membres d'équipe) actuellement assignés à cet avocat.
  const membersFromProps = React.useCallback((): AssignedMember[] => {
    return (lawyer.assignments || [])
      .map((a) => {
        const tm = a.team_members;
        if (!tm || !tm.id) return null;
        return { id: tm.id, prenom: tm.prenom, nom: tm.nom };
      })
      .filter((m): m is AssignedMember => m !== null);
  }, [lawyer.assignments]);

  const [isAssigning, setIsAssigning] = React.useState(false);
  const [busyMemberId, setBusyMemberId] = React.useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = React.useState(lawyer.classement || '');
  const [assignedMembers, setAssignedMembers] = React.useState<AssignedMember[]>(membersFromProps);

  // Synchroniser l'état local avec les props quand elles changent
  React.useEffect(() => {
    setAssignedMembers(membersFromProps());
  }, [membersFromProps]);

  const getClassementColor = (classement: string) => {
    switch (classement) {
      case 'C1': return 'bg-green-100 text-green-800';
      case 'C2': return 'bg-blue-100 text-blue-800';
      case 'C3': return 'bg-yellow-100 text-yellow-800';
      case 'Blacklist': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Soutiens déjà assignés vs membres encore disponibles à ajouter
  const hasAssignments = assignedMembers.length > 0;
  const assignedIds = new Set(assignedMembers.map((m) => m.id));
  const availableMembers = teamMembers.filter((m) => !assignedIds.has(m.id));

  // Ajouter un soutien (sans écraser les autres)
  const handleAddMember = async (teamMemberId: string) => {
    if (!onAssign) return;
    const member = teamMembers.find((m) => m.id === teamMemberId);

    setIsAssigning(true);
    try {
      await onAssign(lawyer, teamMemberId);
      // Ajout optimiste (sans doublon)
      if (member) {
        setAssignedMembers((prev) =>
          prev.some((m) => m.id === member.id)
            ? prev
            : [...prev, { id: member.id, prenom: member.prenom, nom: member.nom }]
        );
      }
    } catch (error) {
      console.error('Erreur assignation:', error);
      // En cas d'erreur, rester sur l'état actuel
    } finally {
      setIsAssigning(false);
    }
  };

  // Retirer un soutien précis
  const handleRemoveMember = async (teamMemberId: string) => {
    if (!onUnassign) return;

    setBusyMemberId(teamMemberId);
    try {
      await onUnassign(lawyer, teamMemberId);
      // Retrait optimiste
      setAssignedMembers((prev) => prev.filter((m) => m.id !== teamMemberId));
    } catch (error) {
      console.error('Erreur désassignation:', error);
      // En cas d'erreur, rester sur l'état actuel
    } finally {
      setBusyMemberId(null);
    }
  };

  // Fonction de changement de statut avec localStorage (plus fiable que l'API)
  const handleStatusChange = async (oldStatus: string, newStatus: string) => {
    try {
      // Import dynamique pour éviter les problèmes SSR
      const { statusChangesStorage } = await import('@/lib/status-changes-storage');
      
      // Récupérer les informations utilisateur depuis les cookies
      let currentUser = { prenom: 'Utilisateur', nom: 'Test' };
      try {
        const userInfoCookie = document.cookie
          .split(';')
          .find(cookie => cookie.trim().startsWith('user-info='));
        
        if (userInfoCookie) {
          const userInfoValue = userInfoCookie.split('=')[1];
          currentUser = JSON.parse(decodeURIComponent(userInfoValue));
        }
      } catch (error) {
        console.warn('Impossible de récupérer les infos utilisateur:', error);
      }
      
      // Sauvegarder le changement dans localStorage
      statusChangesStorage.saveStatusChange({
        lawyer_id: lawyer.prenomnom,
        lawyer_nom: lawyer.nom || '',
        lawyer_prenom: lawyer.prenom || '',
        lawyer_email: lawyer.email || '',
        lawyer_cabinet: lawyer.cabinet || 'Individuel',
        old_status: oldStatus || 'Non classifié',
        new_status: newStatus || 'Non classifié',
        changed_by: `${currentUser.prenom} ${currentUser.nom}`
      });

      console.log(` Statut sauvegardé: ${lawyer.prenomnom} (${oldStatus || 'Non classifié'}  ${newStatus || 'Non classifié'})`);
      
      // Mettre à jour l'état local pour refléter immédiatement le changement
      setCurrentStatus(newStatus);
      
      // Déclencher un événement personnalisé pour informer les autres pages
      window.dispatchEvent(new CustomEvent('lawyerStatusChanged', {
        detail: {
          lawyerId: lawyer.prenomnom,
          oldStatus,
          newStatus,
          timestamp: Date.now()
        }
      }));
      
      console.log(' Événement lawyerStatusChanged dispatché pour synchronisation cross-pages');
      
    } catch (error) {
      console.error('Erreur changement de statut:', error);
      throw error;
    }
  };

  // Fonction pour valider si l'URL d'image est valide
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    // Rejeter les URLs invalides comme x-raw-image://
    if (url.startsWith('x-raw-image://') || url.startsWith('data:')) return false;
    // Accepter seulement les URLs HTTP/HTTPS valides
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <Card className="lawyer-card p-4">
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-300 relative">
          {lawyer.photo_url && isValidImageUrl(lawyer.photo_url) ? (
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
          <User className={`w-8 h-8 text-gray-500 user-fallback absolute inset-0 m-auto ${lawyer.photo_url && isValidImageUrl(lawyer.photo_url) ? 'hidden' : ''}`} />
        </div>

        <div className="flex-1 min-w-0 flex justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate text-balance">
                {lawyer.nom_complet}
              </h3>
            </div>

            <div className="space-y-1">
              {lawyer.telephone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 icon-hover" />
                  <a 
                    href={`tel:${lawyer.telephone}`} 
                    className="fn-link"
                  >
                    {lawyer.telephone}
                  </a>
                </div>
              )}
              
              {lawyer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 icon-hover" />
                  <a 
                    href={`mailto:${lawyer.email}`} 
                    className="fn-link truncate"
                  >
                    {lawyer.email}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {currentStatus && (
                <Badge className={getClassementColor(currentStatus)}>
                  {currentStatus}
                </Badge>
              )}
              
              {lawyer.statut_cabinet && (
                <Badge variant="outline" className={
                  lawyer.statut_cabinet === 'Associé' 
                    ? 'bg-fn-blue text-white border-fn-blue' 
                    : 'bg-fn-yellow text-black border-fn-yellow'
                }>
                  {lawyer.statut_cabinet === 'Associé' ? '⚖️' : '👨‍💼'} {lawyer.statut_cabinet}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap icon-hover focus-ring"
                  disabled={isAssigning || busyMemberId !== null || availableMembers.length === 0}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Assignation...
                    </>
                  ) : (
                    hasAssignments ? '+ Ajouter une assignation' : 'Assigner'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableMembers.length === 0 ? (
                  <DropdownMenuItem disabled className="text-gray-400">
                    Tous les membres sont assignés
                  </DropdownMenuItem>
                ) : (
                  availableMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => handleAddMember(member.id)}
                      className="cursor-pointer"
                      disabled={isAssigning || busyMemberId !== null}
                    >
                      {member.prenom} {member.nom}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bouton de statut */}
            <StatusButton
              currentStatus={currentStatus}
              lawyerData={{
                prenomnom: lawyer.prenomnom,
                nom: lawyer.nom || '',
                prenom: lawyer.prenom || '',
                email: lawyer.email || '',
                cabinet: lawyer.cabinet || ''
              }}
              onStatusChange={handleStatusChange}
              disabled={isAssigning || busyMemberId !== null}
            />

            {/* Étiquettes des soutiens assignés : une pastille par membre, ✕ pour retirer */}
            {hasAssignments && (
              <div className="flex flex-col gap-1">
                {assignedMembers.map((member) => {
                  const removing = busyMemberId === member.id;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded transition-colors ${
                        removing ? 'opacity-70' : ''
                      }`}
                      title={`Soutien : ${member.prenom} ${member.nom}`}
                    >
                      <span className="truncate">✅ {member.prenom} {member.nom}</span>
                      {onUnassign && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removing || isAssigning}
                          className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                            removing ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-green-200'
                          }`}
                          title="Retirer ce soutien"
                        >
                          {removing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {currentStatus === 'Blacklist' && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertTriangle className="w-3 h-3 icon-hover" />
                <span>Blacklisted</span>
              </div>
            )}

            {/* Icônes de vote pour les élections du Barreau de Paris 2024 */}
            {(lawyer.premier_tour_vote !== undefined || lawyer.second_tour_vote !== undefined) && (
              <div className="flex gap-2 mt-2 justify-end">
                {lawyer.premier_tour_vote !== undefined && (
                  <div className="flex items-center gap-1">
                    <BallotBoxIcon voted={lawyer.premier_tour_vote} className="flex-shrink-0" />
                    <span className="text-xs text-gray-500">1er</span>
                  </div>
                )}
                {lawyer.second_tour_vote !== undefined && (
                  <div className="flex items-center gap-1">
                    <BallotBoxIcon voted={lawyer.second_tour_vote} className="flex-shrink-0" />
                    <span className="text-xs text-gray-500">2e</span>
                  </div>
                )}
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