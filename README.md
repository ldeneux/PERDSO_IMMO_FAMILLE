# Immo famille

Gestion locative partagée : contacts, biens, contrats (avec génération PDF).
Utilise le MÊME projet Supabase que Budget famille — mêmes comptes de connexion.

## 1. Ajouter les nouvelles tables à Supabase

1. Va dans **ton projet Supabase existant** (celui de Budget famille) — pas besoin d'en créer un nouveau.
2. **SQL Editor** > colle le contenu de `supabase/schema.sql` > **Run**.
3. Vérifie dans **Table Editor** que `contacts`, `biens`, `baux` sont créées (les tables de Budget famille ne sont pas touchées).

Aucun nouveau compte à créer : tes deux comptes (toi et ta femme) fonctionnent déjà.

## 2. Créer un dépôt GitHub séparé

Comme pour Budget famille : crée un nouveau dépôt (ex: `immo-famille`), privé, et envoie-y tout le contenu de ce dossier (glisser-déposer via "uploading an existing file", dossier par dossier pour `app`, `components`, `lib`, `supabase`).

## 3. Déployer sur Vercel

1. **Add New > Project**, choisis le dépôt `immo-famille`.
2. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` → la **même** URL que Budget famille
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la **même** clé que Budget famille
3. **Deploy**.

Tu obtiens une deuxième URL (ex: `immo-famille.vercel.app`), connectée à la même base de données, avec les mêmes identifiants de connexion.

## Ce qui est disponible dans cette première version

- **Contacts** : ajout, modification, suppression (locataires, propriétaires, autres)
- **Biens** : ajout, modification, suppression (appartement, maison, garage, parking)
- **Contrats** : création d'un bail liant un contact à un bien, avec génération d'un **PDF récapitulatif** téléchargeable en un clic

⚠️ Le PDF généré est un **récapitulatif des conditions convenues**, pas un contrat de bail juridiquement complet. Pour un usage réel avec un locataire externe à la famille, fais relire par un professionnel ou complète-le avec les clauses légales obligatoires (loi du 6 juillet 1989 pour les locations vides, etc.).

## À venir

- Suivi des écritures locatives (équivalent de l'onglet SUIVI de ton fichier Excel)
- Synthèse coût/gain par bien (loyers perçus vs charges, taxe foncière, assurance...)
