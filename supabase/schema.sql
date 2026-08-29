-- Schéma de l'appli IMMO — à coller dans le MÊME projet Supabase que Budget famille
-- (Project Settings > SQL Editor > Run). Nouvelles tables, aucun impact sur les tables existantes.

create extension if not exists "pgcrypto";

-- 1) Contacts (locataires, propriétaires, autres)
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  civilite text,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  type text not null default 'locataire' check (type in ('locataire', 'proprietaire', 'autre')),
  notes text,
  created_at timestamptz not null default now()
);

-- 2) Biens (garages, appartements, etc.)
create table if not exists biens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  type text not null default 'autre' check (type in ('appartement', 'maison', 'garage', 'parking', 'autre')),
  date_acquisition date,
  prix_achat numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- 3) Baux (contrats de location, lient un contact à un bien)
create table if not exists baux (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references biens(id) on delete restrict,
  locataire_id uuid not null references contacts(id) on delete restrict,
  bailleur_nom text,
  date_debut date not null,
  date_fin date,
  loyer_hors_charges numeric not null default 0,
  charges numeric not null default 0,
  depot_garantie numeric not null default 0,
  jour_paiement int not null default 1 check (jour_paiement between 1 and 31),
  statut text not null default 'actif' check (statut in ('actif', 'termine')),
  notes text,
  created_at timestamptz not null default now()
);

-- 4) Écritures locatives (suivi des loyers/charges/taxes par bien)
create table if not exists ecritures_locatives (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references biens(id) on delete restrict,
  bail_id uuid references baux(id) on delete set null,
  categorie text not null,
  label text not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('debit', 'credit')),
  date date not null,
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;
alter table biens enable row level security;
alter table baux enable row level security;
alter table ecritures_locatives enable row level security;

create policy "authenticated can read contacts" on contacts for select using (auth.role() = 'authenticated');
create policy "authenticated can write contacts" on contacts for insert with check (auth.role() = 'authenticated');
create policy "authenticated can update contacts" on contacts for update using (auth.role() = 'authenticated');
create policy "authenticated can delete contacts" on contacts for delete using (auth.role() = 'authenticated');

create policy "authenticated can read biens" on biens for select using (auth.role() = 'authenticated');
create policy "authenticated can write biens" on biens for insert with check (auth.role() = 'authenticated');
create policy "authenticated can update biens" on biens for update using (auth.role() = 'authenticated');
create policy "authenticated can delete biens" on biens for delete using (auth.role() = 'authenticated');

create policy "authenticated can read baux" on baux for select using (auth.role() = 'authenticated');
create policy "authenticated can write baux" on baux for insert with check (auth.role() = 'authenticated');
create policy "authenticated can update baux" on baux for update using (auth.role() = 'authenticated');
create policy "authenticated can delete baux" on baux for delete using (auth.role() = 'authenticated');

create policy "authenticated can read ecritures_locatives" on ecritures_locatives for select using (auth.role() = 'authenticated');
create policy "authenticated can write ecritures_locatives" on ecritures_locatives for insert with check (auth.role() = 'authenticated');
create policy "authenticated can update ecritures_locatives" on ecritures_locatives for update using (auth.role() = 'authenticated');
create policy "authenticated can delete ecritures_locatives" on ecritures_locatives for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table contacts;
alter publication supabase_realtime add table biens;
alter publication supabase_realtime add table baux;
alter publication supabase_realtime add table ecritures_locatives;
