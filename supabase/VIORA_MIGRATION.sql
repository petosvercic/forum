-- Viora Forum: roles (user/moderator/admin) + image upload support
-- Run this in Supabase Dashboard -> SQL Editor (as the project owner).

-- 1) PROFILES: email + role
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'user';

-- keep role sane
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user','moderator','admin'));
  end if;
end $$;

-- backfill email for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- auto-create profile on new signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- helper functions for RLS
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user')
$$;

create or replace function public.is_mod()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('moderator','admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
$$;

-- 2) POSTS: image_urls
alter table public.posts add column if not exists image_urls text[] not null default '{}'::text[];

-- 3) RLS: PROFILES
alter table public.profiles enable row level security;

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check ((id = auth.uid() and role = 'user') or public.is_admin());

-- Optional: allow admins to delete profiles
-- drop policy if exists profiles_delete_admin on public.profiles;
-- create policy profiles_delete_admin
-- on public.profiles for delete
-- to authenticated
-- using (public.is_admin());

-- 4) RLS: POSTS
alter table public.posts enable row level security;

drop policy if exists posts_select_public on public.posts;
create policy posts_select_public
on public.posts for select
to anon, authenticated
using (true);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists posts_update_own_or_mod on public.posts;
create policy posts_update_own_or_mod
on public.posts for update
to authenticated
using (author_id = auth.uid() or public.is_mod())
with check (author_id = auth.uid() or public.is_mod());

drop policy if exists posts_delete_own_or_mod on public.posts;
create policy posts_delete_own_or_mod
on public.posts for delete
to authenticated
using (author_id = auth.uid() or public.is_mod());

-- 5) RLS: COMMENTS
alter table public.comments enable row level security;

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own
on public.comments for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists comments_update_own_or_mod on public.comments;
create policy comments_update_own_or_mod
on public.comments for update
to authenticated
using (author_id = auth.uid() or public.is_mod())
with check (author_id = auth.uid() or public.is_mod());

drop policy if exists comments_delete_own_or_mod on public.comments;
create policy comments_delete_own_or_mod
on public.comments for delete
to authenticated
using (author_id = auth.uid() or public.is_mod());

-- 6) STORAGE: bucket for images + policies
-- Create a public bucket "post-images" and allow:
-- - public read
-- - authenticated upload
-- - owner delete
-- - moderators/admin delete any

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

alter table storage.objects enable row level security;

drop policy if exists "Public read post-images" on storage.objects;
create policy "Public read post-images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'post-images');

drop policy if exists "Authenticated upload post-images" on storage.objects;
create policy "Authenticated upload post-images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'post-images');

drop policy if exists "Owner delete post-images" on storage.objects;
create policy "Owner delete post-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-images' and owner = auth.uid());

drop policy if exists "Mod delete post-images" on storage.objects;
create policy "Mod delete post-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-images' and public.is_mod());
