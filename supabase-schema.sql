create table if not exists public.bolao_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'participant')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  password_history jsonb not null default '[]'::jsonb
);

create table if not exists public.bolao_predictions (
  user_id text primary key references public.bolao_users(id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.bolao_official_results (
  id text primary key default 'official',
  results jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.bolao_history (
  id text primary key,
  type text not null,
  detail text not null,
  user_id text,
  name text,
  email text,
  role text,
  created_at timestamptz not null default now()
);

alter table public.bolao_users enable row level security;
alter table public.bolao_predictions enable row level security;
alter table public.bolao_official_results enable row level security;
alter table public.bolao_history enable row level security;

drop policy if exists "bolao_users_public_read" on public.bolao_users;
drop policy if exists "bolao_users_public_insert" on public.bolao_users;
drop policy if exists "bolao_users_public_update" on public.bolao_users;
drop policy if exists "bolao_users_public_delete" on public.bolao_users;
drop policy if exists "bolao_predictions_public_all" on public.bolao_predictions;
drop policy if exists "bolao_official_public_all" on public.bolao_official_results;
drop policy if exists "bolao_history_public_all" on public.bolao_history;

create policy "bolao_users_public_read"
on public.bolao_users for select
to anon
using (true);

create policy "bolao_users_public_insert"
on public.bolao_users for insert
to anon
with check (true);

create policy "bolao_users_public_update"
on public.bolao_users for update
to anon
using (true)
with check (true);

create policy "bolao_users_public_delete"
on public.bolao_users for delete
to anon
using (role <> 'admin');

create policy "bolao_predictions_public_all"
on public.bolao_predictions for all
to anon
using (true)
with check (true);

create policy "bolao_official_public_all"
on public.bolao_official_results for all
to anon
using (true)
with check (true);

create policy "bolao_history_public_all"
on public.bolao_history for all
to anon
using (true)
with check (true);
