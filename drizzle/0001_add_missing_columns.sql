-- Migration pour ajouter les colonnes manquantes
-- Ajout colonne 'origine' à la table lawyers
ALTER TABLE "lawyers" ADD COLUMN "origine" text;

-- Ajout colonne 'soutien_public' à la table lawyers
ALTER TABLE "lawyers" ADD COLUMN "soutien_public" boolean DEFAULT false;

-- Ajout colonne 'sheet_origin' à la table team_members
ALTER TABLE "team_members" ADD COLUMN "sheet_origin" text;

-- Ajout d'un index sur la colonne origine
CREATE INDEX "lawyers_origine_idx" ON "lawyers" USING btree ("origine");