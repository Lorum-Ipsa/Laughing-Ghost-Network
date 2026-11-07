-- Exported from lgn-development remote Supabase migration history, 2026-11-07.
-- ALREADY APPLIED to that project. DO NOT replay on its existing database.
-- Historical source record: a clean CLI baseline has not been established.

create index ghost_contributions_profile_state_idx on public.ghost_contributions (profile_id, status, updated_at desc);
