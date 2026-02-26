-- Viora Forum: people search + reputation (helpful) + moderation workflow (reports + hide)
-- Run this in Supabase Dashboard -> SQL Editor as the project owner (role: postgres).
--
-- This migration assumes you already ran supabase/VIORA_MIGRATION.sql (roles + storage + image_urls).

-- 0) Safety: extensions
create extension if not exists pgcrypto;

-- 1) CONTACT EMAIL (separate table so it isn't visible to anonymous users)
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  contact_email text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_select_authed on public.profile_contacts;
create policy profile_contacts_select_authed
on public.profile_contacts for select
to authenticated
using (true);

drop policy if exists profile_contacts_upsert_own on public.profile_contacts;
create policy profile_contacts_upsert_own
on public.profile_contacts for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists profile_contacts_update_own on public.profile_contacts;
create policy profile_contacts_update_own
on public.profile_contacts for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists profile_contacts_delete_own on public.profile_contacts;
create policy profile_contacts_delete_own
on public.profile_contacts for delete
to authenticated
using (profile_id = auth.uid());

-- 2) SOFT-HIDE for posts/comments (instead of only delete)
alter table public.posts
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_by uuid,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_reason text;

alter table public.comments
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_by uuid,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_reason text;

-- Update SELECT policies so anonymous/users don't see hidden content.
-- Mods/admins + authors can still see it.

-- POSTS
alter table public.posts enable row level security;

drop policy if exists posts_select_public on public.posts;
create policy posts_select_public
on public.posts for select
to anon, authenticated
using (
  is_hidden = false
  or author_id = auth.uid()
  or public.is_mod()
);

-- COMMENTS
alter table public.comments enable row level security;

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
on public.comments for select
to anon, authenticated
using (
  is_hidden = false
  or author_id = auth.uid()
  or public.is_mod()
);

-- 3) REACTIONS ("helpful" likes)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  kind text not null default 'helpful' check (kind = 'helpful'),
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id, kind)
);

create index if not exists reactions_target_idx on public.reactions (target_type, target_id);
create index if not exists reactions_user_idx on public.reactions (user_id);

alter table public.reactions enable row level security;

drop policy if exists reactions_select_own on public.reactions;
create policy reactions_select_own
on public.reactions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists reactions_insert_own on public.reactions;
create policy reactions_insert_own
on public.reactions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own
on public.reactions for delete
to authenticated
using (user_id = auth.uid());

-- 4) REPORTS (moderation queue)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  unique(target_type, target_id, reporter_id)
);

create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists reports_target_idx on public.reports(target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists reports_insert_authed on public.reports;
create policy reports_insert_authed
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists reports_select_mod on public.reports;
create policy reports_select_mod
on public.reports for select
to authenticated
using (public.is_mod());

drop policy if exists reports_update_mod on public.reports;
create policy reports_update_mod
on public.reports for update
to authenticated
using (public.is_mod())
with check (public.is_mod());

-- 5) RPC helpers (counts for UI)

-- Helpful counts for posts/comments
create or replace function public.get_helpful_counts(
  p_target_type text,
  p_target_ids uuid[]
)
returns table (target_id uuid, helpful_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.target_id, count(*)::bigint as helpful_count
  from public.reactions r
  where r.kind = 'helpful'
    and r.target_type = p_target_type
    and r.target_id = any(p_target_ids)
  group by r.target_id;
$$;

-- Comment + helpful metrics per post (for feed)
create or replace function public.get_post_metrics(
  p_post_ids uuid[]
)
returns table (post_id uuid, comment_count bigint, helpful_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select post_id, count(*)::bigint as comment_count
    from public.comments
    where post_id = any(p_post_ids)
      and is_hidden = false
    group by post_id
  ),
  h as (
    select target_id as post_id, count(*)::bigint as helpful_count
    from public.reactions
    where target_type = 'post'
      and kind = 'helpful'
      and target_id = any(p_post_ids)
    group by target_id
  )
  select p.id as post_id,
         coalesce(c.comment_count, 0) as comment_count,
         coalesce(h.helpful_count, 0) as helpful_count
  from public.posts p
  left join c on c.post_id = p.id
  left join h on h.post_id = p.id
  where p.id = any(p_post_ids);
$$;

-- Reputation: how many posts/comments + how many helpful received (from both posts and comments)
create or replace function public.get_profiles_reputation(
  p_profile_ids uuid[]
)
returns table (profile_id uuid, posts_count bigint, comments_count bigint, helpful_received bigint)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select author_id as profile_id, count(*)::bigint as posts_count
    from public.posts
    where author_id = any(p_profile_ids)
      and is_hidden = false
    group by author_id
  ),
  c as (
    select author_id as profile_id, count(*)::bigint as comments_count
    from public.comments
    where author_id = any(p_profile_ids)
      and is_hidden = false
    group by author_id
  ),
  hp as (
    select po.author_id as profile_id, count(*)::bigint as helpful_post
    from public.reactions r
    join public.posts po on po.id = r.target_id
    where r.target_type = 'post'
      and r.kind = 'helpful'
      and po.author_id = any(p_profile_ids)
      and po.is_hidden = false
    group by po.author_id
  ),
  hc as (
    select co.author_id as profile_id, count(*)::bigint as helpful_comment
    from public.reactions r
    join public.comments co on co.id = r.target_id
    where r.target_type = 'comment'
      and r.kind = 'helpful'
      and co.author_id = any(p_profile_ids)
      and co.is_hidden = false
    group by co.author_id
  )
  select ids.profile_id,
         coalesce(p.posts_count, 0) as posts_count,
         coalesce(c.comments_count, 0) as comments_count,
         (coalesce(hp.helpful_post, 0) + coalesce(hc.helpful_comment, 0)) as helpful_received
  from (select unnest(p_profile_ids) as profile_id) ids
  left join p on p.profile_id = ids.profile_id
  left join c on c.profile_id = ids.profile_id
  left join hp on hp.profile_id = ids.profile_id
  left join hc on hc.profile_id = ids.profile_id;
$$;

