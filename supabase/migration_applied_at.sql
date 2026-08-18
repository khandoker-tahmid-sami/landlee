-- Run this once in the Supabase SQL editor.
-- Adds a timestamp recording the moment a job's status first became
-- 'applied', so the dashboard's monthly chart reflects when you actually
-- applied — not just whatever the status happens to be today.

alter table public.jobs add column if not exists applied_at timestamptz;
