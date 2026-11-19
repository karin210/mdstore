-- Line comments on the "Changes" tab, like a pull request's diff: besides the lines of a revision's
-- file (added or unchanged), reviewers can comment on the lines it removed.
--
-- A comment still belongs to one revision (revision_id). line_side says which file line_number
-- counts in:
--   new  the revision's own file (every comment before this migration, and the File tab's)
--   old  the file the revision is compared with: the previous revision of the same review, or the
--        live version the review started from (see get_base_revision in src/lib/review/reviewView.ts)

alter table public.review_comments
  add column line_side text not null default 'new' check (line_side in ('new', 'old'));

-- Same checks as before, plus the side. The first revision of a new post has nothing to compare
-- with, so it has no old side.
drop function public.add_review_comment(uuid, text, uuid, integer);

create function public.add_review_comment(
  p_review_id uuid,
  p_body text,
  p_revision_id uuid default null,
  p_line_number integer default null,
  p_line_side text default 'new'
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
  v_comment_id uuid;
begin
  select * into v_review from public.prompt_reviews where id = p_review_id;
  if not found or not (public.is_post_author(v_review.post_id) or public.is_admin()) then
    raise exception 'Review not found' using errcode = 'MD404';
  end if;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;
  if char_length(v_body) not between 1 and 5000 then
    raise exception 'A comment needs 1 to 5000 characters' using errcode = 'MD422';
  end if;
  if (p_revision_id is null) <> (p_line_number is null) then
    raise exception 'A line comment needs both a revision and a line' using errcode = 'MD422';
  end if;
  if v_side not in ('new', 'old') or (p_revision_id is null and v_side <> 'new') then
    raise exception 'A line comment is on the new or the old side of a revision' using errcode = 'MD422';
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

    if p_line_number not between 1 and public.count_file_lines(v_file.content) then
      raise exception 'That line is not in the file' using errcode = 'MD422';
    end if;
  end if;

  insert into public.review_comments (review_id, post_id, author_id, body, revision_id, line_number, line_side)
  values (p_review_id, v_review.post_id, v_user, v_body, p_revision_id, p_line_number, v_side)
  returning id into v_comment_id;
  return v_comment_id;
end;
$$;

revoke execute on function public.add_review_comment(uuid, text, uuid, integer, text) from public, anon;
grant execute on function public.add_review_comment(uuid, text, uuid, integer, text) to authenticated;
