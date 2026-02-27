-- VIORA_MIGRATION_8.sql
-- Mark comment as the accepted solution (and set post.status accordingly)
-- Run in Supabase Dashboard -> SQL Editor as role: postgres.

create or replace function public.toggle_solution(p_post_id uuid, p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_author uuid;
  v_is_mod boolean;
  v_was_solution boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select author_id into v_author from public.posts where id = p_post_id;
  if v_author is null then
    raise exception 'Post not found';
  end if;

  v_is_mod := public.is_mod();

  if not v_is_mod and v_author <> v_uid then
    raise exception 'Not allowed';
  end if;

  select is_solution into v_was_solution
  from public.comments
  where id = p_comment_id and post_id = p_post_id;

  if v_was_solution is null then
    raise exception 'Comment not found for post';
  end if;

  if v_was_solution then
    update public.comments set is_solution = false where id = p_comment_id;
    update public.posts
      set status = case when status = 'archived' then status else 'open' end,
          updated_at = now()
      where id = p_post_id;
    return false;
  else
    -- only one solution per post
    update public.comments set is_solution = false where post_id = p_post_id;
    update public.comments set is_solution = true where id = p_comment_id;

    update public.posts
      set status = case when status = 'archived' then status else 'solved' end,
          updated_at = now()
      where id = p_post_id;
    return true;
  end if;
end;
$$;

-- Optional: allow authenticated users to execute the function
revoke all on function public.toggle_solution(uuid, uuid) from public;
grant execute on function public.toggle_solution(uuid, uuid) to authenticated;
