-- Add favorites support to recommendations.
-- Run this in the Supabase SQL editor after 002_outfit_image.sql.

alter table public.recommendations
  add column if not exists is_favorite boolean not null default false;

-- Optimized index for the common "favorites first, recent first" sort
-- and the "favorites only" filter. The user_id leading column lets it
-- piggyback the per-user query without a separate scan.
create index if not exists recommendations_user_id_favorite_created_at_idx
  on public.recommendations (user_id, is_favorite desc, created_at desc);

-- The existing RLS policies already gate update access by user_id, so
-- nothing else is required to allow PATCH /api/history/:id/favorite to
-- write through the service-role client (which bypasses RLS anyway).
drop policy if exists "recommendations_update_own" on public.recommendations;
create policy "recommendations_update_own"
  on public.recommendations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
