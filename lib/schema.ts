import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, real, unique, index } from 'drizzle-orm/pg-core';

export const lawyers = pgTable('lawyers', {
  id: uuid('id').primaryKey().defaultRandom(),
  prenomnom: text('prenomnom').unique().notNull(),
  civilite: text('civilite'),
  nom_complet: text('nom_complet'),
  nom: text('nom'),
  prenom: text('prenom'),
  telephone: text('telephone'),
  email: text('email'),
  annee_serment: integer('annee_serment'),
  cabinet: text('cabinet').notNull(), // Raison sociale (clé de regroupement)
  cabinet_nom_commercial: text('cabinet_nom_commercial'), // Nom commercial (affichage)
  statut_cabinet: text('statut_cabinet'), // MODE_EXE : Collaborateur|Associé|Individuel…
  photo_url: text('photo_url'),
  classement: text('classement'), // C1|C2|C3|Blacklist|null
  origine: text('origine'), // C123 origine
  soutien_public: boolean('soutien_public').default(false),
  // Conformité : plus de soutiens de campagnes précédentes ; conservé (toujours vide) pour compat.
  soutiens_precedents: jsonb('soutiens_precedents').$type<string[]>(),
  ami_linkedin_mhf: boolean('ami_linkedin_mhf').default(false),
  ami_linkedin_fn: boolean('ami_linkedin_fn').default(false),
  // Phase 2 : profil supplémentaire
  xp: text('xp'), // tranche d'ancienneté (0-5, 5-25, 25-50…)
  specialite: text('specialite'),
  mandat: text('mandat'),
  langue: text('langue'),
  nationalite: text('nationalite'),
  tranche_taille_cabinet: text('tranche_taille_cabinet'),
  siren: text('siren'),
  st_siren: text('st_siren'),
  nbr_occur_siren: text('nbr_occur_siren'),
  // Phase 2 : élus 2026
  elus_statut: text('elus_statut'),
  elus_certitude: text('elus_certitude'),
  // Phase 2 : cercles / réseaux (source : MHF)
  cercles: text('cercles').array(),
  raw_data: jsonb('raw_data'),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  cabinetIdx: index('lawyers_cabinet_idx').on(table.cabinet),
}));

export const firms = pgTable('firms', {
  name: text('name').primaryKey(),
  lawyer_count: integer('lawyer_count').default(0),
  c1_count: integer('c1_count').default(0),
  c2_count: integer('c2_count').default(0),
  c3_count: integer('c3_count').default(0),
  bl_count: integer('bl_count').default(0),
  soutien_public_count: integer('soutien_public_count').default(0),
  unclassified_count: integer('unclassified_count').default(0),
  participation_rate: real('participation_rate'),
  assigned_count: integer('assigned_count').default(0),
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  prenom: text('prenom').notNull(),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lawyer_prenomnom: text('lawyer_prenomnom').notNull().references(() => lawyers.prenomnom),
  team_member_id: uuid('team_member_id').notNull().references(() => teamMembers.id),
  assigned_at: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Multi-soutiens : un avocat peut être assigné à plusieurs membres d'équipe,
  // mais pas deux fois au même. Unicité sur le couple (avocat, membre).
  uniqueAssignment: unique('assignments_lawyer_team_unique').on(table.lawyer_prenomnom, table.team_member_id),
}));

export const mailLogs = pgTable('mail_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  team_member_id: uuid('team_member_id').references(() => teamMembers.id),
  subject: text('subject'),
  lawyer_prenomnoms: jsonb('lawyer_prenomnoms').$type<string[]>(),
  status: text('status'), // 'sent' | 'failed'
  error_message: text('error_message'),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow(),
});

export const syncErrors = pgTable('sync_errors', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date', { withTimezone: true }).defaultNow(),
  type_erreur: text('type_erreur').notNull(), // 'orphan' | 'duplicate' | 'invalid'
  prenomnom: text('prenomnom'),
  details: text('details'),
  resolved: boolean('resolved').default(false),
});

// Types pour TypeScript
export type Lawyer = typeof lawyers.$inferSelect;
export type NewLawyer = typeof lawyers.$inferInsert;
export type Firm = typeof firms.$inferSelect;
export type NewFirm = typeof firms.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type MailLog = typeof mailLogs.$inferSelect;
export type NewMailLog = typeof mailLogs.$inferInsert;
export type SyncError = typeof syncErrors.$inferSelect;
export type NewSyncError = typeof syncErrors.$inferInsert;