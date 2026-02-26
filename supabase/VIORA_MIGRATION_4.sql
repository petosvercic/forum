-- Viora Forum: add Post type "product" + relevance sorting support (no DB changes for relevance)
-- Run in Supabase Dashboard -> SQL Editor as role: postgres.

-- Add new enum value to post_type if the enum exists.
do $$
begin
  perform 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' and t.typname = 'post_type';
  -- If exists, add value
  execute $$alter type public.post_type add value if not exists 'product'$$;
exception
  when undefined_object then
    -- If post_type doesn't exist (e.g. type is TEXT), ignore.
    null;
end $$;
