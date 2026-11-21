-- Output examples: the screenshots an author attaches to show what the prompt produces. Images live in
-- a public Storage bucket; each revision (and the post, like the other listing fields: the live version
-- once approved, the latest revision while pending) keeps the list of them as jsonb:
--   [{ "path": "<user id>/<uuid>.png", "caption": "…" }, …]
--
-- The bucket is public so the listing page can show the images to everyone, but only a signed-in user can
-- write, and only inside the folder named after their own id. The list's shape is checked here; the app
-- checks the image bytes (type, size) before uploading. Paths are unguessable, and a path in a list
-- always points to a file in the bucket's `<user id>/` folder of whoever pushed the revision.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'output-examples',
  'output-examples',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "Users upload output examples to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'output-examples'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Reading and deleting are limited to the user's own folder too (public URLs need no policy); deleting
-- is how the app cleans up uploads of a post that failed to save.
create policy "Users read their own output examples"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'output-examples'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own output examples"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'output-examples'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- A list of at most 6 `{ path, caption }` objects: the path in the shape the app uploads
-- (`<uuid>/<uuid>.png|jpg|webp`), the caption a string of up to 120 characters.
create function public.are_output_examples(p_examples jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_examples) = 'array'
    and jsonb_array_length(p_examples) <= 6
    and not exists (
      select 1
      from jsonb_array_elements(p_examples) as example
      where jsonb_typeof(example) <> 'object'
        or jsonb_typeof(example -> 'path') is distinct from 'string'
        or jsonb_typeof(example -> 'caption') is distinct from 'string'
        or (example ->> 'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
        or char_length(example ->> 'caption') > 120
    );
$$;

alter table public.posted_prompts
  add column output_examples jsonb not null default '[]'
    check (public.are_output_examples(output_examples));

alter table public.prompt_revisions
  add column output_examples jsonb not null default '[]'
    check (public.are_output_examples(output_examples));

-- Revision 1 of a new post copies the examples too (same body as in 20261123000000_add_tested_models.sql).
create or replace function public.start_post_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
begin
  insert into public.post_authors (post_id, user_id, role) values (new.id, new.author_id, 'owner');

  insert into public.prompt_reviews (post_id, number, opened_by)
  values (new.id, 1, new.author_id)
  returning id into v_review_id;

  insert into public.prompt_revisions (
    post_id, review_id, number, created_by, kind, file_name, title, tagline, summary, category,
    meant_for, highlights, usage_steps, works_with, tested_models, recommended_models, output_examples,
    content, preview_line_count
  )
  values (
    new.id, v_review_id, 1, new.author_id, new.kind, new.file_name, new.title, new.tagline, new.summary,
    new.category, new.meant_for, new.highlights, new.usage_steps, new.works_with, new.tested_models,
    new.recommended_models, new.output_examples, new.content, new.preview_line_count
  );
  return null;
end;
$$;

-- Approving a review makes its last revision live: carry its examples onto the post along with the models
-- (the trigger posted_prompts_copy_live_models already runs this function).
create or replace function public.copy_live_revision_models()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select r.tested_models, r.recommended_models, r.output_examples
  into new.tested_models, new.recommended_models, new.output_examples
  from public.prompt_revisions r
  where r.id = new.live_revision_id;
  return new;
end;
$$;

-- push_revision gains the examples. Same body as in 20261123000000_add_tested_models.sql plus the new
-- list on the revision and, for a pending post, on the post.
drop function public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text, text[], text[]);

create function public.push_revision(
  p_post_id uuid,
  p_kind text,
  p_file_name text,
  p_title text,
  p_tagline text,
  p_summary text,
  p_category text,
  p_meant_for text[],
  p_highlights text[],
  p_usage_steps text[],
  p_works_with text[],
  p_content text,
  p_preview_line_count integer,
  p_note text default null,
  p_tested_models text[] default '{}',
  p_recommended_models text[] default '{}',
  p_output_examples jsonb default '[]'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_post public.posted_prompts;
  v_review public.prompt_reviews;
  v_number integer;
  v_note text := nullif(btrim(p_note), '');
begin
  if not public.is_post_author(p_post_id) then
    raise exception 'Only the post''s authors can push revisions' using errcode = 'MD403';
  end if;
  if char_length(v_note) > 5000 then
    raise exception 'The note is too long' using errcode = 'MD422';
  end if;

  -- Locks the post so two authors pushing at once get consecutive numbers.
  select * into v_post from public.posted_prompts where id = p_post_id for update;
  if v_post.status in ('rejected', 'withdrawn') then
    raise exception 'This post is closed' using errcode = 'MD409';
  end if;

  select * into v_review
  from public.prompt_reviews
  where post_id = p_post_id and status in ('open', 'changes_requested');

  if found then
    update public.prompt_reviews set status = 'open' where id = v_review.id;
  else
    insert into public.prompt_reviews (post_id, number, opened_by, base_revision_id)
    values (
      p_post_id,
      (select coalesce(max(number), 0) + 1 from public.prompt_reviews where post_id = p_post_id),
      v_user,
      v_post.live_revision_id
    )
    returning * into v_review;
  end if;

  select coalesce(max(number), 0) + 1 into v_number from public.prompt_revisions where post_id = p_post_id;

  insert into public.prompt_revisions (
    post_id, review_id, number, created_by, kind, file_name, title, tagline, summary, category,
    meant_for, highlights, usage_steps, works_with, tested_models, recommended_models, output_examples,
    content, preview_line_count
  )
  values (
    p_post_id, v_review.id, v_number, v_user, p_kind, p_file_name, p_title, p_tagline, p_summary, p_category,
    p_meant_for, p_highlights, p_usage_steps, p_works_with, p_tested_models, p_recommended_models,
    p_output_examples, p_content, p_preview_line_count
  );

  -- A post that was never approved shows its latest revision (to its authors and admins).
  if v_post.status = 'pending' then
    update public.posted_prompts
    set kind = p_kind, file_name = p_file_name, title = p_title, tagline = p_tagline, summary = p_summary,
        category = p_category, meant_for = p_meant_for, highlights = p_highlights, usage_steps = p_usage_steps,
        works_with = p_works_with, tested_models = p_tested_models, recommended_models = p_recommended_models,
        output_examples = p_output_examples, content = p_content, preview_line_count = p_preview_line_count
    where id = p_post_id;
  end if;

  if v_note is not null then
    insert into public.review_comments (review_id, post_id, author_id, body)
    values (v_review.id, p_post_id, v_user, v_note);
  end if;

  return v_number;
end;
$$;

revoke execute on function
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text, text[], text[], jsonb)
from public, anon;
grant execute on function
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text, text[], text[], jsonb)
to authenticated;
