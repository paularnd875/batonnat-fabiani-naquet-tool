# État du projet Batonnat Fabiani Naquet Tool

## Statut au 1er juin 2026

**BUG D'AFFICHAGE DES BOUTONS : RÉSOLU**

Le problème de cache qui empêchait l'affichage en temps réel des assignations/désassignations a été corrigé :
- Cache 1 an supprimé du middleware pour les routes `/api`  
- Routes dynamiques forcées avec `force-dynamic` et `revalidate: 0`
- Headers `Cache-Control: no-store, no-cache, must-revalidate` sur toutes les APIs
- Logique de succès assign/désassign basée sur le SELECT `existing`, pas sur `count` (peu fiable avec Supabase RLS)

Les boutons se mettent maintenant à jour immédiatement après "Données rechargées".

## Dernier commit
`38ca9f8` - fix: cache API (middleware no-store sur /api) + succès assign/desassign fiable sans count

## Bugs restants à traiter plus tard

### a) Images avocats en erreur 502 
Erreur Next/Image sur justacote.com - nécessite proxy ou fallback

### b) Statuts de classement en localStorage
Stockage fragile côté client, à migrer en base de données pour persistance

### c) Warning next.config turbopack
Configuration turbopack mal placée sous experimental, à corriger

## Architecture technique

- **Frontend** : Next.js 16 avec TypeScript
- **Base de données** : Supabase PostgreSQL + Google Sheets (source)  
- **Cache** : Service unifié avec TTL 5 minutes (données avocats uniquement)
- **Authentification** : Cookie-based avec middleware de protection
- **Déploiement** : Vercel avec variables d'environnement

## APIs principales

- `/api/cabinet/[name]` - Liste des avocats par cabinet (pagination)
- `/api/assignments` - Gestion assignations (POST/DELETE)
- `/api/cabinet-with-localstorage/[name]` - Fusion avec localStorage client
- `/api/sync` - Synchronisation Google Sheets → Supabase

Toutes les APIs sont en mode `force-dynamic` sans cache navigateur.