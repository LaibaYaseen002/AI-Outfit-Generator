-- Recommendations (outfit history) table.
-- Run this once in the Supabase SQL editor before using /api/history.
--
-- The BE writes/reads this table via the service-role client (bypasses RLS),
-- and authorization is enforced in code by filtering on user_id = req.user.id.
-- RLS policies below are defense-in-depth so direct DB access from the FE
-- (with the anon key) is also locked down per-user.

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text,
  skin_tone text not null check (skin_tone in ('light','medium','dark')),
  skin_hex text,
  occasion text not null,
  preferences jsonb not null default '{}'::jsonb,
  outfit jsonb not null,
  colors jsonb not null,
  explanation text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists recommendations_user_id_created_at_idx
  on public.recommendations (user_id, created_at desc);

alter table public.recommendations enable row level security;

drop policy if exists "recommendations_select_own" on public.recommendations;
create policy "recommendations_select_own"
  on public.recommendations for select
  using (auth.uid() = user_id);

drop policy if exists "recommendations_insert_own" on public.recommendations;
create policy "recommendations_insert_own"
  on public.recommendations for insert
  with check (auth.uid() = user_id);

drop policy if exists "recommendations_delete_own" on public.recommendations;
create policy "recommendations_delete_own"
  on public.recommendations for delete
  using (auth.uid() = user_id);
