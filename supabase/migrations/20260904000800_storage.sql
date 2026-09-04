-- =============================================================================
-- Knowledge Vault — private file storage
-- =============================================================================
-- A single private bucket holds every uploaded file (PDFs attached to sources,
-- files dropped into the Inbox).
--
-- The path convention is load-bearing, not cosmetic:
--
--     {user_id}/{entity}/{uuid}.{ext}
--
-- The first path segment is the owner. Every policy below compares that
-- segment to auth.uid(), which means a user cannot read, overwrite or delete an
-- object outside their own prefix even if they guess its full name. Files are
-- served through short-lived signed URLs, never public ones.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vault',
  'vault',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/epub+zip',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do nothing;

create policy vault_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy vault_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy vault_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy vault_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
