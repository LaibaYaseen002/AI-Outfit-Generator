-- Add shareable-link support to recommendations.
-- Run this in the Supabase SQL editor after 003_favorites.sql.
--
-- A non-null share_token means the recommendation has a public read-only
-- view available at /share/<token>. Setting it back to null revokes access.
-- The token itself is unguessable (32 random bytes, base64url) and acts as
-- the bearer credential for GET /api/share/:token, which is the ONLY public
-- endpoint that exposes recommendation data.

alter table public.recommendations
  add column if not exists share_token text;

-- Unique partial index — only enforces uniqueness on rows that actually
-- have a token, so unsetting (null) doesn't collide.
create unique index if not exists recommendations_share_token_idx
  on public.recommendations (share_token)
  where share_token is not null;
