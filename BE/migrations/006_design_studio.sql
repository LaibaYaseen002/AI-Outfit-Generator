-- AI Fashion Designer (Design Studio) — Phase 1.
--
-- design_references: per-user uploaded reference images (neck, sleeves,
-- daman, etc). Each has a `tag` describing what part of the outfit it
-- represents. `analysis` is a JSON blob written by the vision pass so we
-- don't re-pay for it on regeneration.
--
-- designs: a generation run. References by id (array), the user's prompt,
-- the controls JSON, the built prompt we actually sent the image model,
-- and the output image path + lifecycle status. The status lifecycle
-- mirrors the outfit-preview one in 002_outfit_image.sql.
--
-- Storage convention: <userId>/design-refs/<uuid>.<ext> for uploads and
-- <userId>/designs/<uuid>.png for outputs — same bucket, same first-
-- folder-is-owner-id rule used everywhere else.
--
-- Run this in the Supabase SQL editor after 005_wardrobe.sql.

create table if not exists public.design_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  tag text not null check (tag in (
    'neck','sleeves','back','front','daman',
    'trouser','dupatta','embroidery','fabric','other'
  )),
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists design_references_user_id_created_at_idx
  on public.design_references (user_id, created_at desc);

alter table public.design_references enable row level security;

drop policy if exists "design_references_select_own" on public.design_references;
create policy "design_references_select_own"
  on public.design_references for select
  using (auth.uid() = user_id);

drop policy if exists "design_references_insert_own" on public.design_references;
create policy "design_references_insert_own"
  on public.design_references for insert
  with check (auth.uid() = user_id);

drop policy if exists "design_references_update_own" on public.design_references;
create policy "design_references_update_own"
  on public.design_references for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "design_references_delete_own" on public.design_references;
create policy "design_references_delete_own"
  on public.design_references for delete
  using (auth.uid() = user_id);


create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_ids uuid[] not null default '{}',
  user_prompt text not null,
  controls jsonb not null default '{}'::jsonb,
  built_prompt text not null default '',
  output_path text,
  output_status text not null default 'pending'
    check (output_status in ('pending','generating','ready','failed')),
  output_error text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designs_user_id_created_at_idx
  on public.designs (user_id, created_at desc);

alter table public.designs enable row level security;

drop policy if exists "designs_select_own" on public.designs;
create policy "designs_select_own"
  on public.designs for select
  using (auth.uid() = user_id);

drop policy if exists "designs_insert_own" on public.designs;
create policy "designs_insert_own"
  on public.designs for insert
  with check (auth.uid() = user_id);

drop policy if exists "designs_update_own" on public.designs;
create policy "designs_update_own"
  on public.designs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "designs_delete_own" on public.designs;
create policy "designs_delete_own"
  on public.designs for delete
  using (auth.uid() = user_id);
