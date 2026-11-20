-- The specific AI models a post was tested against, picked on the upload form, and the ones the
-- author recommends. Stored like the other listing fields: on every revision, and on the post
-- (the live version once approved, the latest revision while pending).
--
-- The ids are the keys of the app's model registry (src/data/aiModels.ts). The database only
-- checks their shape, not the list itself, so the registry can change without a migration; the
-- app ignores ids it doesn't know. Both lists are optional.

create function public.are_model_ids(p_ids text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(id ~ '^[a-z0-9][a-z0-9.-]{0,39}$'), true) from unnest(p_ids) as id;
$$;

alter table public.posted_prompts
  add column tested_models text[] not null default '{}'
    check (cardinality(tested_models) <= 20 and public.are_model_ids(tested_models)),
  add column recommended_models text[] not null default '{}'
    check (recommended_models <@ tested_models);

alter table public.prompt_revisions
  add column tested_models text[] not null default '{}'
    check (cardinality(tested_models) <= 20 and public.are_model_ids(tested_models)),
  add column recommended_models text[] not null default '{}'
    check (recommended_models <@ tested_models);

-- Revision 1 of a new post copies the models too.
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
    meant_for, highlights, usage_steps, works_with, tested_models, recommended_models, content, preview_line_count
  )
  values (
    new.id, v_review_id, 1, new.author_id, new.kind, new.file_name, new.title, new.tagline, new.summary,
    new.category, new.meant_for, new.highlights, new.usage_steps, new.works_with, new.tested_models,
    new.recommended_models, new.content, new.preview_line_count
  );
  return null;
end;
$$;

-- Approving a review makes its last revision live (decide_review sets live_revision_id); this
-- carries that revision's models onto the post, so decide_review itself needs no change.
create function public.copy_live_revision_models()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select r.tested_models, r.recommended_models
  into new.tested_models, new.recommended_models
  from public.prompt_revisions r
  where r.id = new.live_revision_id;
  return new;
end;
$$;

create trigger posted_prompts_copy_live_models
  before update of live_revision_id on public.posted_prompts
  for each row
  when (new.live_revision_id is distinct from old.live_revision_id and new.live_revision_id is not null)
  execute function public.copy_live_revision_models();

revoke execute on function public.copy_live_revision_models() from public, anon, authenticated;

-- push_revision gains the two lists. Same body as before (see 20261116000000_add_collaborative_review.sql)
-- plus the models on the new revision and, for a pending post, on the post.
drop function public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text);

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
  p_recommended_models text[] default '{}'
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
    meant_for, highlights, usage_steps, works_with, tested_models, recommended_models, content, preview_line_count
  )
  values (
    p_post_id, v_review.id, v_number, v_user, p_kind, p_file_name, p_title, p_tagline, p_summary, p_category,
    p_meant_for, p_highlights, p_usage_steps, p_works_with, p_tested_models, p_recommended_models, p_content,
    p_preview_line_count
  );

  -- A post that was never approved shows its latest revision (to its authors and admins).
  if v_post.status = 'pending' then
    update public.posted_prompts
    set kind = p_kind, file_name = p_file_name, title = p_title, tagline = p_tagline, summary = p_summary,
        category = p_category, meant_for = p_meant_for, highlights = p_highlights, usage_steps = p_usage_steps,
        works_with = p_works_with, tested_models = p_tested_models, recommended_models = p_recommended_models,
        content = p_content, preview_line_count = p_preview_line_count
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
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text, text[], text[])
from public, anon;
grant execute on function
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text, text[], text[])
to authenticated;
