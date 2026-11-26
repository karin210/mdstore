-- The owner of a post deletes it for good, from the uploads list on /profile and /my-prompts. Deleting the
-- posted_prompts row cascades to its authors, reviews, revisions, comments, invites and ratings.
--
-- Output example images live in Storage, which a database delete doesn't reach. The function returns every
-- image path the post used (on any revision) so the app removes them with the Storage API; it can only
-- remove those in the caller's own folder (the bucket's delete policy), so images a co-author uploaded stay.
--
--   MD401 not signed in   MD403 an author but not the owner   MD404 no such post, or the caller can't see it

create function public.delete_post(p_post_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  perform public.require_profile();
  if not exists (select 1 from public.posted_prompts where id = p_post_id)
    or not (public.is_post_author(p_post_id) or public.is_admin()) then
    raise exception 'Post not found' using errcode = 'MD404';
  end if;
  if not public.is_post_owner(p_post_id) then
    raise exception 'Only the post''s owner can delete it' using errcode = 'MD403';
  end if;

  select coalesce(array_agg(distinct example ->> 'path'), '{}')
  into v_paths
  from (
    select jsonb_array_elements(output_examples) as example from public.prompt_revisions where post_id = p_post_id
    union all
    select jsonb_array_elements(output_examples) from public.posted_prompts where id = p_post_id
  ) examples
  where example ->> 'path' is not null;

  delete from public.posted_prompts where id = p_post_id;
  return v_paths;
end;
$$;

revoke execute on function public.delete_post(uuid) from public, anon;
grant execute on function public.delete_post(uuid) to authenticated;
