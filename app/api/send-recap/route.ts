import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import nodemailer from 'nodemailer';

interface Assignment {
  id: string;
  lawyer_prenomnom: string;
  assigned_at: string;
  team_members: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
  };
  lawyers: {
    prenomnom: string;
    nom_complet: string;
    email: string;
    telephone: string;
    cabinet: string;
    classement: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { team_member_id, type = 'individual' } = body;

    // Vérifier la configuration Gmail
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Configuration Gmail manquante. Veuillez configurer GMAIL_USER et GMAIL_APP_PASSWORD dans les variables d\'environnement.',
      }, { status: 500 });
    }

    if (process.env.GMAIL_USER === 'votre-email@gmail.com' || process.env.GMAIL_APP_PASSWORD === 'votre-mot-de-passe-application') {
      return NextResponse.json({
        success: false,
        error: 'Veuillez remplacer les valeurs par défaut de GMAIL_USER et GMAIL_APP_PASSWORD par vos vraies credentials Gmail.',
      }, { status: 500 });
    }

    // Configuration du transporteur Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    if (type === 'individual' && team_member_id) {
      // Récupérer les assignations pour un membre spécifique
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          *,
          team_members (
            id,
            prenom,
            nom,
            email
          ),
          lawyers (
            prenomnom,
            nom_complet,
            email,
            telephone,
            cabinet,
            classement
          )
        `)
        .eq('team_member_id', team_member_id) as { data: Assignment[] | null; error: any };

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Aucune assignation trouvée pour ce membre d\'équipe',
        });
      }

      const teamMember = assignments[0].team_members;
      
      // Générer le contenu de l'email
      const emailContent = generateIndividualRecapEmail(assignments, teamMember);

      // Envoyer l'email
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: teamMember.email,
        subject: `🎯 Récapitulatif de vos assignations - Bâtonnat Fabiani-Naquet 2026`,
        text: emailContent,
      });

      // Enregistrer le log de l'envoi
      await supabase
        .from('mail_logs')
        .insert({
          recipient_email: teamMember.email,
          subject: 'Récapitulatif assignations',
          type: 'individual_recap',
          metadata: {
            team_member_id,
            assignments_count: assignments.length,
          },
        });

      return NextResponse.json({
        success: true,
        message: `Email envoyé à ${teamMember.prenom} ${teamMember.nom}`,
        assignments_count: assignments.length,
      });

    } else if (type === 'global') {
      // Récupérer toutes les assignations groupées par membre d'équipe
      const { data: allAssignments, error } = await supabase
        .from('assignments')
        .select(`
          *,
          team_members (
            id,
            prenom,
            nom,
            email
          ),
          lawyers (
            prenomnom,
            nom_complet,
            email,
            telephone,
            cabinet,
            classement
          )
        `) as { data: Assignment[] | null; error: any };

      if (error) throw error;

      if (!allAssignments || allAssignments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Aucune assignation trouvée',
        });
      }

      // Grouper par membre d'équipe
      const assignmentsByMember = new Map<string, {
        member: Assignment['team_members'];
        assignments: Assignment[];
      }>();

      allAssignments.forEach((assignment) => {
        const memberId = assignment.team_members.id;
        if (!assignmentsByMember.has(memberId)) {
          assignmentsByMember.set(memberId, {
            member: assignment.team_members,
            assignments: [],
          });
        }
        assignmentsByMember.get(memberId)!.assignments.push(assignment);
      });

      // Envoyer un email à chaque membre
      const sentEmails = [];
      for (const [_, { member, assignments }] of assignmentsByMember) {
        const emailContent = generateIndividualRecapEmail(assignments, member);

        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: member.email,
          subject: `🎯 Récapitulatif de vos assignations - Bâtonnat Fabiani-Naquet 2026`,
          text: emailContent,
        });

        // Log l'envoi
        await supabase
          .from('mail_logs')
          .insert({
            recipient_email: member.email,
            subject: 'Récapitulatif assignations',
            type: 'global_recap',
            metadata: {
              team_member_id: member.id,
              assignments_count: assignments.length,
            },
          });

        sentEmails.push({
          member: `${member.prenom} ${member.nom}`,
          email: member.email,
          assignments_count: assignments.length,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Emails envoyés à ${sentEmails.length} membres d'équipe`,
        sent_emails: sentEmails,
        total_assignments: allAssignments.length,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Type de récapitulatif non valide',
    }, { status: 400 });

  } catch (error) {
    console.error(' Erreur envoi email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

function generateIndividualRecapEmail(assignments: Assignment[], teamMember: Assignment['team_members']): string {
  // Filtrer les assignations pour exclure les C1, C2, C3 (déjà acquis)
  const filteredAssignments = assignments.filter((assignment: any) => {
    const classement = assignment.lawyers.classement;
    return classement !== 'C1' && classement !== 'C2' && classement !== 'C3';
  });
  
  const totalAssignments = filteredAssignments.length;
  
  // Créer une liste simple numérotée des contacts (sans les C1, C2, C3)
  let contactsList = '';
  filteredAssignments.forEach((assignment, index) => {
    const lawyer = assignment.lawyers;
    const contactNumber = index + 1;
    const name = lawyer.nom_complet || lawyer.prenomnom || 'Nom non disponible';
    const email = lawyer.email || 'email non disponible';
    const phone = lawyer.telephone || 'téléphone non disponible';
    
    contactsList += `Contact ${contactNumber} - ${name} - ${email} - ${phone}\n`;
  });

  return `Bonjour ${teamMember.prenom.toLowerCase()},

Voici les ${totalAssignments} contacts que tu t'es engagé à transformer :

${contactsList}

Note: Les avocats classés C1, C2, C3 ne sont pas inclus dans cette liste car ils sont considérés comme déjà acquis.

Pensez-bien à indiquer une fois que vous avez contacté les avocats susmentionnés leurs cercles via ce lien : https://leganov.typeform.com/contactsfabnaq

Merci et à très vite

--
Marie-Hélène et Frédéric`;
}