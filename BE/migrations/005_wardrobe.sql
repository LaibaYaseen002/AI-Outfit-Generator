-- Wardrobe-mode support: a per-user library of clothing items the user
-- already owns. The outfit generator can be constrained to pick ONLY
-- from items in this table when the request sets wardrobeOnly=true.
--
-- Run this in the Supabase SQL editor after 004_share_token.sql.
--
-- Storage convention for the photo: <userId>/wardrobe/<uuid>.<ext>, in the
-- same private 'user-photos' bucket used elsewhere. The first folder must
-- be the owner's user id so the existing IDOR check (path.split("/")[0]
-- === req.user.id) keeps working.

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  category text not null check (category in ('top','bottom','footwear','accessory','outerwear')),
  name text not null,
  colors jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wardrobe_items_user_id_created_at_idx
  on public.wardrobe_items (user_id, created_at desc);

create index if not exists wardrobe_items_user_id_category_idx
  on public.wardrobe_items (user_id, category);

alter table public.wardrobe_items enable row level security;

drop policy if exists "wardrobe_items_select_own" on public.wardrobe_items;
create policy "wardrobe_items_select_own"
  on public.wardrobe_items for select
  using (auth.uid() = user_id);

drop policy if exists "wardrobe_items_insert_own" on public.wardrobe_items;
create policy "wardrobe_items_insert_own"
  on public.wardrobe_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "wardrobe_items_update_own" on public.wardrobe_items;
create policy "wardrobe_items_update_own"
  on public.wardrobe_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wardrobe_items_delete_own" on public.wardrobe_items;
create policy "wardrobe_items_delete_own"
  on public.wardrobe_items for delete
  using (auth.uid() = user_id);
