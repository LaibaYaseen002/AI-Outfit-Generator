-- Add image-preview columns to recommendations.
-- Run this in the Supabase SQL editor after 001_recommendations.sql.

alter table public.recommendations
  add column if not exists outfit_image_path text,
  add column if not exists image_status text not null default 'idle',
  add column if not exists image_error text,
  add column if not exists image_updated_at timestamptz;

-- Constrain to known states. Use a DO block to drop+recreate safely if it
-- already exists from a previous run.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'recommendations_image_status_check'
  ) then
    alter table public.recommendations drop constraint recommendations_image_status_check;
  end if;
end$$;

alter table public.recommendations
  add constraint recommendations_image_status_check
  check (image_status in ('idle','pending','generating','ready','failed'));
