-- Multi-soutiens : autoriser l'assignation d'un avocat à plusieurs membres d'équipe.
-- Remplace la contrainte UNIQUE mono-colonne sur lawyer_prenomnom par une
-- contrainte composite (lawyer_prenomnom, team_member_id).
--
-- Purement additif : aucune donnée n'est supprimée. Comme la règle précédente
-- interdisait déjà >1 soutien par avocat, aucun doublon (lawyer, membre) ne peut
-- exister, donc la nouvelle contrainte s'applique proprement.
--
-- À exécuter dans le SQL Editor Supabase (transactionnel).

BEGIN;

-- 1. Retire la contrainte UNIQUE mono-colonne sur lawyer_prenomnom, quel que soit son nom.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'assignments'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'assignments'::regclass AND attname = 'lawyer_prenomnom'
    );
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', c);
  END IF;
END $$;

-- 2. Ajoute la contrainte composite : un avocat ↔ un même soutien = une seule fois.
ALTER TABLE assignments
  ADD CONSTRAINT assignments_lawyer_team_unique
  UNIQUE (lawyer_prenomnom, team_member_id);

COMMIT;
