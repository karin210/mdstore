-- Suggested changes, like a pull request's: a line comment can carry replacement text for one line or a
-- range of lines of a revision's file. The post's authors accept it (as written or after editing it), which
-- pushes a new revision with the change applied, or reject it. Several accepted at once make one revision.
--
-- A suggestion is a review_comments row with `suggestion` set:
--   revision_id, line_number, line_end  the lines it replaces, in that revision's own file (line_side 'new')
--   suggestion                          the replacement lines; '{}' deletes the lines
--   suggestion_state                    pending, accepted or rejected
--   applied_suggestion                  what was applied, when the author edited it first
--   applied_revision_id                 the revision the change went into
--   resolved_by, resolved_at            who accepted or rejected it, and when
--
-- Applying always works on the review's latest revision. A suggestion made on an earlier revision still
-- applies when its lines are unchanged: at the same line numbers, or found exactly once elsewhere in the
-- file (locate_suggestion). Otherwise it is outdated and can only be rejected. The app shows the same
-- status with locate_suggestion in src/lib/review/suggestions.ts; keep the two in step.

alter table public.review_comments
  add column suggestion text[]
    check (array_position(suggestion, null) is null and char_length(array_to_string(suggestion, E'\n')) <= 204800),
  add column line_end integer,
  add column suggestion_state text check (suggestion_state in ('pending', 'accepted', 'rejected')),
  add column applied_suggestion text[],
  add column applied_revision_id uuid references public.prompt_revisions (id) on delete set null,
  add column resolved_by uuid references public.profiles (user_id) on delete set null,
  add column resolved_at timestamptz,
  add constraint review_comments_suggestion_pairs_check check ((suggestion is null) = (suggestion_state is null)),
  add constraint review_comments_suggestion_line_check
    check (suggestion is null or (revision_id is not null and line_number is not null and line_side = 'new')),
  add constraint review_comments_line_end_check
    check (line_end is null or (suggestion is not null and line_end >= line_number));

-- A suggestion speaks for itself, so its message is optional.
alter table public.review_comments drop constraint review_comments_check1;
alter table public.review_comments
  add constraint review_comments_body_required_check
    check (decision is not null or suggestion is not null or coalesce(char_length(btrim(body)), 0) >= 1);

-- An author's suggestions to answer, for the review page.
create index review_comments_pending_suggestions_idx
  on public.review_comments (review_id) where suggestion_state = 'pending';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The lines of a file, counted like count_file_lines and splitFileLines (a final newline doesn't add one).
create function public.split_file_lines(p_content text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select string_to_array(regexp_replace(replace(p_content, E'\r\n', E'\n'), E'\n$', ''), E'\n');
$$;

-- Where lines that started at p_line_number in an earlier file are in p_file: the same line numbers when
-- they still match there, else the only place they appear. Null when they changed or appear more than once.
create function public.locate_suggestion(p_original text[], p_line_number integer, p_file text[])
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_length integer := cardinality(p_original);
  v_found integer;
  v_count integer := 0;
begin
  if v_length = 0 then
    return null;
  end if;
  if p_file[p_line_number:p_line_number + v_length - 1] = p_original then
    return p_line_number;
  end if;
  for v_start in 1 .. coalesce(cardinality(p_file), 0) - v_length + 1 loop
    if p_file[v_start:v_start + v_length - 1] = p_original then
      v_count := v_count + 1;
      v_found := v_start;
    end if;
  end loop;
  return case when v_count = 1 then v_found end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments take suggestions
-- ---------------------------------------------------------------------------

-- Same as in 20261120000000_add_line_comment_side.sql, plus p_suggestion and p_line_end. A suggestion is
-- on the new side of a revision of this review, its range is inside that file, and it changes something.
drop function public.add_review_comment(uuid, text, uuid, integer, text);

create function public.add_review_comment(
  p_review_id uuid,
  p_body text,
  p_revision_id uuid default null,
  p_line_number integer default null,
  p_line_side text default 'new',
  p_suggestion text[] default null,
  p_line_end integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_review public.prompt_reviews;
  v_revision public.prompt_revisions;
  v_file public.prompt_revisions;
  v_body text := btrim(coalesce(p_body, ''));
  v_side text := coalesce(p_line_side, 'new');
  v_is_suggestion boolean := p_suggestion is not null;
  v_line_end integer := coalesce(p_line_end, p_line_number);
  v_lines text[];
  v_comment_id uuid;
begin
  select * into v_review from public.prompt_reviews where id = p_review_id;
  if not found or not (public.is_post_author(v_review.post_id) or public.is_admin()) then
    raise exception 'Review not found' using errcode = 'MD404';
  end if;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;
  if char_length(v_body) > 5000 or (char_length(v_body) = 0 and not v_is_suggestion) then
    raise exception 'A comment needs 1 to 5000 characters' using errcode = 'MD422';
  end if;
  if (p_revision_id is null) <> (p_line_number is null) then
    raise exception 'A line comment needs both a revision and a line' using errcode = 'MD422';
  end if;
  if v_side not in ('new', 'old') or (p_revision_id is null and v_side <> 'new') then
    raise exception 'A line comment is on the new or the old side of a revision' using errcode = 'MD422';
  end if;
  if v_is_suggestion and (p_revision_id is null or v_side <> 'new') then
    raise exception 'A suggestion changes lines of a revision''s own file' using errcode = 'MD422';
  end if;
  if p_line_end is not null and (not v_is_suggestion or p_line_end < p_line_number) then
    raise exception 'Only a suggestion spans lines, from the first to the last' using errcode = 'MD422';
  end if;
  if v_is_suggestion and (
    array_position(p_suggestion, null) is not null
    or char_length(array_to_string(p_suggestion, E'\n')) > 204800
  ) then
    raise exception 'The suggestion is not valid' using errcode = 'MD422';
  end if;

  if p_revision_id is not null then
    select * into v_revision from public.prompt_revisions where id = p_revision_id and review_id = p_review_id;
    if not found then
      raise exception 'That revision is not part of this review' using errcode = 'MD422';
    end if;

    v_file := v_revision;
    if v_side = 'old' then
      select * into v_file from public.prompt_revisions
        where review_id = p_review_id and number < v_revision.number
        order by number desc
        limit 1;
      if not found then
        select * into v_file from public.prompt_revisions where id = v_review.base_revision_id;
      end if;
      if not found then
        raise exception 'That revision has nothing to compare with' using errcode = 'MD422';
      end if;
    end if;

    if p_line_number < 1 or v_line_end > public.count_file_lines(v_file.content) then
      raise exception 'That line is not in the file' using errcode = 'MD422';
    end if;

    if v_is_suggestion then
      v_lines := public.split_file_lines(v_file.content);
      if v_lines[p_line_number:v_line_end] = p_suggestion then
        raise exception 'The suggestion changes nothing' using errcode = 'MD422';
      end if;
    end if;
  end if;

  insert into public.review_comments (
    review_id, post_id, author_id, body, revision_id, line_number, line_side, suggestion, line_end, suggestion_state
  )
  values (
    p_review_id, v_review.post_id, v_user, nullif(v_body, ''), p_revision_id, p_line_number, v_side, p_suggestion,
    case when v_is_suggestion and v_line_end > p_line_number then v_line_end end,
    case when v_is_suggestion then 'pending' end
  )
  returning id into v_comment_id;
  return v_comment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Authors answer suggestions
-- ---------------------------------------------------------------------------

-- An author accepts one or more pending suggestions of a review in progress. p_suggestions is a JSON array
-- of { "id": <comment id> } objects, with "lines" (an array of strings) when the author edited the
-- replacement first. The changes are applied to the review's latest revision and pushed as one new revision
-- (through push_revision, so the listing and everything else carry over), with p_note as its note.
-- Returns the new revision's number.
--   MD403 not an author   MD409 review closed, or a suggestion already answered or outdated
--   MD422 unknown suggestion, overlapping ones, an empty file, or bad input
create function public.apply_suggestions(p_review_id uuid, p_suggestions jsonb, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_review public.prompt_reviews;
  v_latest public.prompt_revisions;
  v_suggestion public.review_comments;
  v_item jsonb;
  v_lines text[];
  v_file text[];
  v_original text[];
  v_has_final_newline boolean;
  v_content text;
  v_start integer;
  v_number integer;
  v_new_revision_id uuid;
  v_changes jsonb := '[]';
  v_change jsonb;
  v_previous_start integer;
begin
  select * into v_review from public.prompt_reviews where id = p_review_id;
  if not found or not (public.is_post_author(v_review.post_id) or public.is_admin()) then
    raise exception 'Review not found' using errcode = 'MD404';
  end if;
  if not public.is_post_author(v_review.post_id) then
    raise exception 'Only the post''s authors accept suggestions' using errcode = 'MD403';
  end if;

  -- Same lock as push_revision, taken first so nobody pushes between reading the file and applying.
  perform 1 from public.posted_prompts where id = v_review.post_id for update;
  select * into v_review from public.prompt_reviews where id = p_review_id;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;
  if jsonb_typeof(p_suggestions) is distinct from 'array' or jsonb_array_length(p_suggestions) = 0 then
    raise exception 'Choose at least one suggestion' using errcode = 'MD422';
  end if;

  select * into v_latest from public.prompt_revisions where review_id = p_review_id order by number desc limit 1;
  v_file := public.split_file_lines(v_latest.content);
  v_has_final_newline := replace(v_latest.content, E'\r\n', E'\n') ~ E'\n$';

  -- Each suggestion: where its lines are in the latest file, and what replaces them.
  for v_item in select value from jsonb_array_elements(p_suggestions) loop
    select * into v_suggestion
    from public.review_comments
    where id = (v_item ->> 'id')::uuid and review_id = p_review_id and suggestion is not null
    for update;
    if not found then
      raise exception 'Suggestion not found' using errcode = 'MD422';
    end if;
    if v_suggestion.suggestion_state <> 'pending' then
      raise exception 'That suggestion was already answered' using errcode = 'MD409';
    end if;
    if exists (select 1 from jsonb_array_elements(v_changes) c where c ->> 'id' = v_suggestion.id::text) then
      raise exception 'A suggestion is listed twice' using errcode = 'MD422';
    end if;

    select (public.split_file_lines(content))[v_suggestion.line_number:coalesce(v_suggestion.line_end, v_suggestion.line_number)]
    into v_original
    from public.prompt_revisions
    where id = v_suggestion.revision_id;
    v_start := public.locate_suggestion(v_original, v_suggestion.line_number, v_file);
    if v_start is null then
      raise exception 'That suggestion is outdated: its lines changed' using errcode = 'MD409';
    end if;

    if v_item ? 'lines' then
      if jsonb_typeof(v_item -> 'lines') <> 'array'
        or exists (select 1 from jsonb_array_elements(v_item -> 'lines') l where jsonb_typeof(l) <> 'string') then
        raise exception 'Edited lines must be text' using errcode = 'MD422';
      end if;
      v_lines := array(select jsonb_array_elements_text(v_item -> 'lines'));
    else
      v_lines := v_suggestion.suggestion;
    end if;

    v_changes := v_changes || jsonb_build_object(
      'id', v_suggestion.id,
      'start', v_start,
      'end', v_start + cardinality(v_original) - 1,
      'lines', to_jsonb(v_lines),
      'edited', v_item ? 'lines' and v_lines is distinct from v_suggestion.suggestion
    );
  end loop;

  -- Applied from the bottom of the file up, so the line numbers of the changes still to apply hold.
  -- Sorted that way, each change must end above the start of the one applied before it.
  for v_change in
    select value from jsonb_array_elements(v_changes) order by (value ->> 'start')::integer desc
  loop
    if v_previous_start is not null and (v_change ->> 'end')::integer >= v_previous_start then
      raise exception 'Two suggestions change the same lines' using errcode = 'MD422';
    end if;
    v_previous_start := (v_change ->> 'start')::integer;
    v_file :=
      v_file[1:(v_change ->> 'start')::integer - 1]
      || array(select jsonb_array_elements_text(v_change -> 'lines'))
      || v_file[(v_change ->> 'end')::integer + 1:];
  end loop;

  v_content := array_to_string(v_file, E'\n') || case when v_has_final_newline then E'\n' else '' end;
  if btrim(v_content, E' \t\n') = '' then
    raise exception 'The file can''t end up empty' using errcode = 'MD422';
  end if;
  if char_length(v_content) > 204800 then
    raise exception 'The file would be too long' using errcode = 'MD422';
  end if;

  v_number := public.push_revision(
    v_latest.post_id, v_latest.kind, v_latest.file_name, v_latest.title, v_latest.tagline, v_latest.summary,
    v_latest.category, v_latest.meant_for, v_latest.highlights, v_latest.usage_steps, v_latest.works_with,
    v_content, v_latest.preview_line_count, p_note, v_latest.tested_models, v_latest.recommended_models,
    v_latest.output_examples
  );
  select id into v_new_revision_id from public.prompt_revisions where post_id = v_latest.post_id and number = v_number;

  update public.review_comments c
  set suggestion_state = 'accepted',
      applied_suggestion = case
        when (ch ->> 'edited')::boolean then array(select jsonb_array_elements_text(ch -> 'lines'))
      end,
      applied_revision_id = v_new_revision_id,
      resolved_by = v_user,
      resolved_at = now()
  from jsonb_array_elements(v_changes) ch
  where c.id = (ch ->> 'id')::uuid;

  return v_number;
end;
$$;

-- An author turns a pending suggestion down, with an optional reply that joins the suggestion's line
-- thread. Outdated suggestions are answered this way too.
create function public.reject_suggestion(p_comment_id uuid, p_reply text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_suggestion public.review_comments;
  v_review public.prompt_reviews;
  v_reply text := nullif(btrim(p_reply), '');
begin
  select * into v_suggestion from public.review_comments where id = p_comment_id and suggestion is not null for update;
  if not found or not (public.is_post_author(v_suggestion.post_id) or public.is_admin()) then
    raise exception 'Suggestion not found' using errcode = 'MD404';
  end if;
  if not public.is_post_author(v_suggestion.post_id) then
    raise exception 'Only the post''s authors answer suggestions' using errcode = 'MD403';
  end if;
  select * into v_review from public.prompt_reviews where id = v_suggestion.review_id;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;
  if v_suggestion.suggestion_state <> 'pending' then
    raise exception 'That suggestion was already answered' using errcode = 'MD409';
  end if;
  if char_length(v_reply) > 5000 then
    raise exception 'The reply is too long' using errcode = 'MD422';
  end if;

  update public.review_comments
  set suggestion_state = 'rejected', resolved_by = v_user, resolved_at = now()
  where id = p_comment_id;

  if v_reply is not null then
    insert into public.review_comments (review_id, post_id, author_id, body, revision_id, line_number, line_side)
    values (
      v_suggestion.review_id, v_suggestion.post_id, v_user, v_reply, v_suggestion.revision_id,
      v_suggestion.line_number, 'new'
    );
  end if;
end;
$$;

revoke execute on function
  public.add_review_comment(uuid, text, uuid, integer, text, text[], integer),
  public.apply_suggestions(uuid, jsonb, text),
  public.reject_suggestion(uuid, text)
from public, anon;
grant execute on function
  public.add_review_comment(uuid, text, uuid, integer, text, text[], integer),
  public.apply_suggestions(uuid, jsonb, text),
  public.reject_suggestion(uuid, text)
to authenticated;

-- Plain helpers with no access to data; kept off the API anyway.
revoke execute on function
  public.split_file_lines(text),
  public.locate_suggestion(text[], integer, text[])
from public, anon, authenticated;
