-- SCRIPT DE SÉCURISATION SUPABASE URGENTE
-- Active Row Level Security sur toutes les tables

-- === ACTIVATION RLS ===

-- Table des avocats (données principales)
ALTER TABLE public.avocats ENABLE ROW LEVEL SECURITY;

-- Table des cabinets  
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;

-- Table des assignations
ALTER TABLE public.assignations ENABLE ROW LEVEL SECURITY;

-- Table des utilisateurs/membres d'équipe
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Table des logs de changement de statut
ALTER TABLE public.status_change_logs_sqlite ENABLE ROW LEVEL SECURITY;

-- === POLITIQUES DE SÉCURITÉ ===
-- Ces politiques permettent l'accès aux utilisateurs authentifiés seulement

-- AVOCATS : Lecture seule pour tous les utilisateurs authentifiés
CREATE POLICY "Allow authenticated read access" ON public.avocats
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- CABINETS : Lecture seule pour tous les utilisateurs authentifiés  
CREATE POLICY "Allow authenticated read access" ON public.cabinets
    FOR SELECT  
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ASSIGNATIONS : Accès complet pour utilisateurs authentifiés
CREATE POLICY "Allow authenticated full access" ON public.assignations
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- TEAM_MEMBERS : Lecture seule pour utilisateurs authentifiés
CREATE POLICY "Allow authenticated read access" ON public.team_members
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Création de nouveaux membres (pour le formulaire d'inscription)
CREATE POLICY "Allow team member creation" ON public.team_members
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- STATUS_CHANGE_LOGS : Accès complet pour utilisateurs authentifiés
CREATE POLICY "Allow authenticated full access" ON public.status_change_logs_sqlite
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- === PERMISSIONS POUR L'APPLICATION ===
-- L'application utilise la clé service_role, donc elle garde tous les accès
-- Mais maintenant les accès publics anonymes sont bloqués

-- Vérification que RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;