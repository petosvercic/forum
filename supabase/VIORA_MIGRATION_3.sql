-- Viora Forum: categories admin UI + People listing privacy + reactions safety
-- Run in Supabase Dashboard -> SQL Editor as role: postgres.

-- 0) Ensure helper functions exist (idempotent)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_mod()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator','admin')
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_mod() to anon, authenticated;

-- 1) Profiles: opt-out from People listing
alter table public.profiles
  add column if not exists is_public boolean not null default true;

-- Fix RLS policy so users can update their profile even if they're admin/mod,
-- but cannot change role unless they're admin.
-- (Replaces the old "role='user'" constraint that blocks admins from editing their own profile.)

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
  or public.is_admin()
);

-- 2) Categories (groups) managed by admin
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

-- uniqueness
create unique index if not exists forum_categories_slug_key on public.forum_categories (slug);
create unique index if not exists forum_categories_name_key on public.forum_categories (name);

alter table public.forum_categories enable row level security;

drop policy if exists forum_categories_select_public on public.forum_categories;
create policy forum_categories_select_public
on public.forum_categories for select
to anon, authenticated
using (true);

drop policy if exists forum_categories_write_admin on public.forum_categories;
create policy forum_categories_write_admin
on public.forum_categories
for insert
to authenticated
with check (public.is_admin());

drop policy if exists forum_categories_update_admin on public.forum_categories;
create policy forum_categories_update_admin
on public.forum_categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists forum_categories_delete_admin on public.forum_categories;
create policy forum_categories_delete_admin
on public.forum_categories
for delete
to authenticated
using (public.is_admin());

-- seed (safe)
insert into public.forum_categories (name, slug, sort_order)
values
  ('Remeslo a technika', 'remeslo-a-technika', 10),
  ('Dev a automatizácie', 'dev-a-automatizacie', 20),
  ('Dizajn a kreatíva', 'dizajn-a-kreativa', 30),
  ('Biznis a marketing', 'biznis-a-marketing', 40),
  ('Produktivita a systémy', 'produktivita-a-systemy', 50),
  ('Vzdelávanie a učenie', 'vzdelavanie-a-ucenie', 60),
  ('Právo a financie', 'pravo-a-financie', 70),
  ('Zdravie a fitness', 'zdravie-a-fitness', 80),
  ('Hobby a voľný čas', 'hobby-a-volny-cas', 90),
  ('Meta', 'meta', 100)
on conflict (slug) do nothing;

-- 3) Reactions safety: ensure kind exists + prevent duplicates
alter table public.reactions
  add column if not exists kind text;

update public.reactions set kind = 'helpful' where kind is null;

-- Deduplicate before unique index
with ranked as (
  select ctid, user_id, target_type, target_id, kind,
         row_number() over (partition by user_id, target_type, target_id, kind order by created_at asc nulls last) as rn
  from public.reactions
)
delete from public.reactions r
using ranked x
where r.ctid = x.ctid and x.rn > 1;

-- Unique index including kind (for upsert)
create unique index if not exists reactions_unique_user_target_kind
on public.reactions (user_id, target_type, target_id, kind);
