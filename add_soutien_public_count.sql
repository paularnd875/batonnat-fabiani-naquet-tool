-- Migration: Ajouter colonne soutien_public_count à la table firms
-- Date: 2026-05-04

-- Ajouter la colonne soutien_public_count avec valeur par défaut 0
ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS soutien_public_count integer DEFAULT 0;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN firms.soutien_public_count IS 'Nombre d''avocats ayant un soutien public dans ce cabinet';