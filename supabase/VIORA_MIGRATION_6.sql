-- VIORA_MIGRATION_6.sql
-- Media attachments (video/audio) for posts + share-friendly routes (/welcome, /forum/c/[slug])
--
-- Run in Supabase Dashboard -> SQL Editor as role: postgres.
--
-- NOTE (Storage):
-- Create a Storage bucket named `post-media` in Supabase Dashboard -> Storage.
-- Suggested policies for bucket `post-media`:
--  - SELECT: allow anon + authenticated (public read)  [or authenticated only if you want]
--  - INSERT: allow authenticated
-- This migration does not touch storage.objects (often requires supabase_storage_admin).

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  mime_type text,
  media_type text not null check (media_type in ('video','audio')),
  original_name text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_id_idx on public.post_media(post_id);

alter table public.post_media enable row level security;

-- Anyone can read media metadata (actual file access is governed by Storage policies)
drop policy if exists "post_media_select_all" on public.post_media;
create policy "post_media_select_all"
on public.post_media
for select
using (true);

-- Only authenticated users can insert their own media
drop policy if exists "post_media_insert_own" on public.post_media;
create policy "post_media_insert_own"
on public.post_media
for insert
to authenticated
with check (uploader_id = auth.uid());

-- Owner or mod/admin can delete
drop policy if exists "post_media_delete_owner_or_mod" on public.post_media;
create policy "post_media_delete_owner_or_mod"
on public.post_media
for delete
to authenticated
using (uploader_id = auth.uid() or public.is_mod());
