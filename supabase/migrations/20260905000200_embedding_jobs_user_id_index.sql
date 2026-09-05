-- Missing per the Etapa 8 hardening convention: every user-owned table indexes
-- its `user_id`, both for the foreign key and because RLS filters on it.
-- Caught by the Supabase advisor right after the previous migration.
create index embedding_jobs_user_id_idx on public.embedding_jobs (user_id);
