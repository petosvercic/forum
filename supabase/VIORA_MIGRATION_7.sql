-- VIORA_MIGRATION_7.sql
-- Lock tutorial categories (read-only for normal users)
-- Run in Supabase Dashboard -> SQL Editor as role: postgres.
--
-- Note: posts.category stores CATEGORY NAME (not slug) in this project.

-- Keep SELECT policy as-is (public read).
-- Tighten INSERT/UPDATE/DELETE so tutorial categories can be modified only by mods/admins.

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_mod()
    or category not in ('Ako používať fórum','Projekty & spolupráce','Q&A / otázky')
  )
);

drop policy if exists posts_update_own_or_mod on public.posts;
create policy posts_update_own_or_mod
on public.posts
for update
to authenticated
using (
  public.is_mod()
  or (author_id = auth.uid() and category not in ('Ako používať fórum','Projekty & spolupráce','Q&A / otázky'))
)
with check (
  public.is_mod()
  or (author_id = auth.uid() and category not in ('Ako používať fórum','Projekty & spolupráce','Q&A / otázky'))
);

drop policy if exists posts_delete_own_or_mod on public.posts;
create policy posts_delete_own_or_mod
on public.posts
for delete
to authenticated
using (
  public.is_mod()
  or (author_id = auth.uid() and category not in ('Ako používať fórum','Projekty & spolupráce','Q&A / otázky'))
);
