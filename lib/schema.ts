import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, real, unique, index } from 'drizzle-orm/pg-core';

export const lawyers = pgTable('lawyers', {
  id: uuid('id').primaryKey().defaultRandom(),
  prenomnom: text('prenomnom').unique().notNull(),
  civilite: text('civilite'),
  nom_complet: text('nom_complet'),
  telephone: text('telephone'),
  email: text('email'),
  annee_serment: integer('annee_serment'),
  cabinet: text('cabinet').notNull(),
  classement: text('classement'), // C1|C2|C3|Blacklist|null
  soutiens_precedents: jsonb('soutiens_precedents').$type<string[]>(),
  ami_linkedin_mhf: boolean('ami_linkedin_mhf').default(false),
  ami_linkedin_fn: boolean('ami_linkedin_fn').default(false),
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
  uniqueAssignment: unique().on(table.lawyer_prenomnom),
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