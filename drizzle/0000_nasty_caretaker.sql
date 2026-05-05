CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_prenomnom" text NOT NULL,
	"team_member_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assignments_lawyer_prenomnom_unique" UNIQUE("lawyer_prenomnom")
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"name" text PRIMARY KEY NOT NULL,
	"lawyer_count" integer DEFAULT 0,
	"c1_count" integer DEFAULT 0,
	"c2_count" integer DEFAULT 0,
	"c3_count" integer DEFAULT 0,
	"bl_count" integer DEFAULT 0,
	"unclassified_count" integer DEFAULT 0,
	"participation_rate" real,
	"assigned_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "lawyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prenomnom" text NOT NULL,
	"civilite" text,
	"nom_complet" text,
	"telephone" text,
	"email" text,
	"annee_serment" integer,
	"cabinet" text NOT NULL,
	"classement" text,
	"soutiens_precedents" jsonb,
	"ami_linkedin_mhf" boolean DEFAULT false,
	"ami_linkedin_fn" boolean DEFAULT false,
	"raw_data" jsonb,
	"last_synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "lawyers_prenomnom_unique" UNIQUE("prenomnom")
);
--> statement-breakpoint
CREATE TABLE "mail_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid,
	"subject" text,
	"lawyer_prenomnoms" jsonb,
	"status" text,
	"error_message" text,
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp with time zone DEFAULT now(),
	"type_erreur" text NOT NULL,
	"prenomnom" text,
	"details" text,
	"resolved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lawyer_prenomnom_lawyers_prenomnom_fk" FOREIGN KEY ("lawyer_prenomnom") REFERENCES "public"."lawyers"("prenomnom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_logs" ADD CONSTRAINT "mail_logs_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lawyers_cabinet_idx" ON "lawyers" USING btree ("cabinet");