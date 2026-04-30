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
        html: emailContent,
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
          html: emailContent,
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
    console.error('❌ Erreur envoi email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }, { status: 500 });
  }
}

function generateIndividualRecapEmail(assignments: Assignment[], teamMember: Assignment['team_members']): string {
  const totalAssignments = assignments.length;
  
  // Grouper par cabinet
  const assignmentsByFirm = new Map<string, Assignment[]>();
  assignments.forEach((assignment) => {
    const firmName = assignment.lawyers.cabinet || 'Cabinet non renseigné';
    if (!assignmentsByFirm.has(firmName)) {
      assignmentsByFirm.set(firmName, []);
    }
    assignmentsByFirm.get(firmName)!.push(assignment);
  });

  // Statistiques
  const stats = {
    c1: assignments.filter(a => a.lawyers.classement === 'C1').length,
    c2: assignments.filter(a => a.lawyers.classement === 'C2').length,
    c3: assignments.filter(a => a.lawyers.classement === 'C3').length,
    firms: assignmentsByFirm.size,
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Récapitulatif des assignations</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 16px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    .stat-card {
      background: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .firm-section {
      margin: 24px 0;
    }
    .firm-header {
      background: #1e40af;
      color: white;
      padding: 12px 16px;
      border-radius: 6px 6px 0 0;
      font-weight: 600;
    }
    .lawyer-list {
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 6px 6px;
    }
    .lawyer-item {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .lawyer-item:last-child {
      border-bottom: none;
    }
    .lawyer-name {
      font-weight: 500;
    }
    .lawyer-contact {
      font-size: 14px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-c1 { background: #dcfce7; color: #166534; }
    .badge-c2 { background: #fef3c7; color: #92400e; }
    .badge-c3 { background: #fed7aa; color: #9a3412; }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .cta {
      background: #1e40af;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      display: inline-block;
      margin: 16px 0;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚖️ Bâtonnat Fabiani-Naquet 2026</div>
      <div class="subtitle">Récapitulatif de vos assignations</div>
    </div>

    <p>Bonjour <strong>${teamMember.prenom} ${teamMember.nom}</strong>,</p>
    
    <p>Voici le récapitulatif de vos assignations actuelles pour la campagne :</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${totalAssignments}</div>
        <div class="stat-label">Avocats assignés</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.firms}</div>
        <div class="stat-label">Cabinets</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.c1}</div>
        <div class="stat-label">Priorité C1</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.c2 + stats.c3}</div>
        <div class="stat-label">Priorité C2/C3</div>
      </div>
    </div>

    ${Array.from(assignmentsByFirm.entries()).map(([firmName, firmAssignments]) => `
      <div class="firm-section">
        <div class="firm-header">
          📁 ${firmName} (${firmAssignments.length} avocat${firmAssignments.length > 1 ? 's' : ''})
        </div>
        <div class="lawyer-list">
          ${firmAssignments.map(assignment => `
            <div class="lawyer-item">
              <div>
                <div class="lawyer-name">${assignment.lawyers.nom_complet}</div>
                <div class="lawyer-contact">
                  ${assignment.lawyers.email || 'Email non disponible'} 
                  ${assignment.lawyers.telephone ? `• ${assignment.lawyers.telephone}` : ''}
                </div>
              </div>
              <span class="badge badge-${assignment.lawyers.classement?.toLowerCase() || 'c3'}">
                ${assignment.lawyers.classement || 'Non classé'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="cta">
        🔗 Accéder à l'application
      </a>
    </div>

    <div class="footer">
      <p><strong>Prochaines étapes :</strong></p>
      <ul style="text-align: left; display: inline-block;">
        <li>Contactez les avocats C1 en priorité</li>
        <li>Préparez vos arguments de campagne</li>
        <li>Planifiez vos rendez-vous</li>
        <li>Reportez vos échanges dans l'application</li>
      </ul>
      <p style="margin-top: 24px;">
        Email généré automatiquement le ${new Date().toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
  </div>
</body>
</html>`;
}