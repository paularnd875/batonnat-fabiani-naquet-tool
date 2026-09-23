-- Phase 2 : champs issus du nouveau classeur source (260915 Data | Batonnat Fabiani-Naquet)
-- Migration ADDITIVE et idempotente. À lancer dans le SQL Editor Supabase.
-- Aucune donnée existante n'est modifiée ni supprimée.

-- Colonnes que la sync écrivait déjà sans être déclarées dans schema.ts
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS origine text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS soutien_public boolean DEFAULT false;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS statut_cabinet text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS photo_url text;

-- Nom / prénom persistés (colonnes dédiées NOM / PRENOM1 de la source)
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS prenom text;

-- Nom commercial du cabinet (affichage plus lisible que la raison sociale)
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cabinet_nom_commercial text;

-- Profil supplémentaire
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS xp text;                     -- tranche d'ancienneté (0-5, 5-25, 25-50…)
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS specialite text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS mandat text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS langue text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS nationalite text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS tranche_taille_cabinet text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS siren text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS st_siren text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS nbr_occur_siren text;

-- Élus 2026
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS elus_statut text;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS elus_certitude text;

-- Cercles / réseaux (source : MHF) : liste des cercles auxquels appartient l'avocat
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cercles text[];

-- Index utiles pour les filtres
CREATE INDEX IF NOT EXISTS lawyers_cercles_idx ON lawyers USING gin (cercles);
CREATE INDEX IF NOT EXISTS lawyers_st_siren_idx ON lawyers (st_siren);
CREATE INDEX IF NOT EXISTS lawyers_elus_statut_idx ON lawyers (elus_statut);
