-- Collaborative review, modelled on pull requests:
--
--   profiles         one public @username per account (bylines, comments, adding co-authors)
--   post_authors     who may edit a post: one owner plus any number of co-authors
--   prompt_reviews   one review per proposed change ("pull request"): the first one decides whether
--                    a new post goes public; later ones propose changes to an approved post
--   prompt_revisions every version an author pushed ("commit"), a full copy of the listing
--   review_comments  the conversation of a review: thread comments, comments on one line of a
--                    revision's file, and the review decisions
--   post_invites     one-time links an owner shares to add a co-author
--
-- posted_prompts keeps holding what /prompts/[slug] shows: the latest revision while a post has
-- never been approved, then the approved ("live") revision. Approving a later review copies its
-- latest revision over the live one; until then the public page doesn't change.
--
-- Every write goes through the security definer functions at the end, which check who is calling
-- (author, owner or admin) and keep the tables consistent. The tables themselves only have select
-- policies, so the API can read what row-level security allows and write nothing directly.

-- ---------------------------------------------------------------------------
-- 1. Usernames
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9._-]{2,39}$'),
  created_at timestamptz not null default now()
);

-- Usernames are unique ignoring case, so @Ana and @ana can't both exist.
create unique index profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Usernames are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- No update policy: a username is permanent for now, so bylines and comments keep their name.
create policy "Users pick their own username"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Sign-up sends the chosen username as user metadata; this creates the profile with the account.
-- A taken or malformed name is skipped instead of failing the sign-up: the app then asks the user
-- to pick another one before they can post.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    begin
      insert into public.profiles (user_id, username)
      values (new.id, new.raw_user_meta_data ->> 'username');
    exception
      when unique_violation or check_violation then null;
    end;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Existing authors get the handle they typed on their latest post. A clash (two accounts used the
-- same handle) falls back to user-<8 characters of the id>; they can't rename yet, so keep it rare.
insert into public.profiles (user_id, username)
select distinct on (author_id) author_id, ltrim(author_handle, '@')
from public.posted_prompts
order by author_id, created_at desc
on conflict do nothing;

insert into public.profiles (user_id, username)
select distinct author_id, 'user-' || left(replace(author_id::text, '-', ''), 8)
from public.posted_prompts
where author_id not in (select user_id from public.profiles)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Authors
-- ---------------------------------------------------------------------------

create table public.post_authors (
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null check (role in ('owner', 'coauthor')),
  joined_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create unique index post_authors_one_owner_idx on public.post_authors (post_id) where role = 'owner';
create index post_authors_user_id_idx on public.post_authors (user_id);

insert into public.post_authors (post_id, user_id, role, joined_at)
select id, author_id, 'owner', created_at from public.posted_prompts;

alter table public.post_authors enable row level security;

-- Authors are shown wherever their post is: a public byline once approved, and to the authors and
-- admins before that. The subquery runs under posted_prompts' own policy, which decides.
create policy "Authors are visible with their post"
  on public.post_authors for select
  to anon, authenticated
  using (exists (select 1 from public.posted_prompts p where p.id = post_id));

-- security definer so policies can call them without recursing through post_authors' own policy.
create function public.is_post_author(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.post_authors where post_id = p_post_id and user_id = (select auth.uid())
  );
$$;

create function public.is_post_owner(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.post_authors
    where post_id = p_post_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. posted_prompts: co-authors can see their posts, owners can withdraw them
-- ---------------------------------------------------------------------------

alter table public.posted_prompts
  drop constraint posted_prompts_status_check,
  add constraint posted_prompts_status_check
    check (status in ('pending', 'approved', 'rejected', 'withdrawn'));

drop policy "Approved prompts are public, authors see their own, admins see all" on public.posted_prompts;

create policy "Approved prompts are public, authors see their own, admins see all"
  on public.posted_prompts for select
  to anon, authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = author_id
    or public.is_post_author(id)
    or public.is_admin()
  );

-- Reviews now go through decide_review(), which records the decision in the review's history.
-- Direct updates would bypass it, so they are no longer allowed (the SQL editor still can).
drop policy "Admins review prompts" on public.posted_prompts;

-- ---------------------------------------------------------------------------
-- 4. Reviews and revisions
-- ---------------------------------------------------------------------------

create table public.prompt_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  -- 1, 2, 3… per post, for URLs and headings ("Review #2").
  number integer not null check (number >= 1),
  status text not null default 'open'
    check (status in ('open', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  -- The live revision this review proposes to replace; null for a post's first review.
  base_revision_id uuid,
  opened_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles (user_id) on delete set null,
  unique (post_id, number)
);

-- At most one review in progress per post: authors push to it until an admin closes it.
create unique index prompt_reviews_one_active_idx
  on public.prompt_reviews (post_id) where status in ('open', 'changes_requested');
-- The admin queue: open reviews, oldest first.
create index prompt_reviews_status_created_at_idx on public.prompt_reviews (status, created_at);

-- Same columns and checks as posted_prompts (keep the three in sync with src/lib/validation/promptPost.ts).
create table public.prompt_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  review_id uuid not null references public.prompt_reviews (id) on delete cascade,
  -- 1, 2, 3… per post, across all its reviews.
  number integer not null check (number >= 1),
  created_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('prompt', 'skill')),
  file_name text not null check (file_name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.md$' and char_length(file_name) <= 64),
  title text not null check (char_length(title) between 3 and 80),
  tagline text not null check (char_length(tagline) between 10 and 140),
  summary text not null check (char_length(summary) between 20 and 400),
  category text not null
    check (category in ('conventions', 'agents', 'frontend', 'testing', 'refactoring', 'devops')),
  meant_for text[] not null check (cardinality(meant_for) between 1 and 6),
  highlights text[] not null check (cardinality(highlights) between 1 and 10),
  usage_steps text[] not null check (cardinality(usage_steps) between 1 and 8),
  works_with text[] not null check (cardinality(works_with) between 1 and 8),
  content text not null check (char_length(content) between 1 and 204800),
  preview_line_count integer not null check (preview_line_count between 5 and 40),
  unique (post_id, number)
);

create index prompt_revisions_review_id_idx on public.prompt_revisions (review_id);

alter table public.prompt_reviews
  add constraint prompt_reviews_base_revision_id_fkey
  foreign key (base_revision_id) references public.prompt_revisions (id) on delete set null;

-- The revision /prompts/[slug] shows publicly; null until the first approval.
alter table public.posted_prompts
  add column live_revision_id uuid references public.prompt_revisions (id) on delete set null;

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.prompt_reviews (id) on delete cascade,
  -- Repeated from the review so the select policy needs no join.
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  author_id uuid references public.profiles (user_id) on delete set null,
  body text check (char_length(body) <= 5000),
  -- Set together for a comment on one line of a revision's file.
  revision_id uuid references public.prompt_revisions (id) on delete cascade,
  line_number integer check (line_number >= 1),
  -- Set on the entry that records a decision; its body is the reviewer's message, if any.
  decision text check (decision in ('approved', 'changes_requested', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  check (line_number is null or revision_id is not null),
  -- coalesce: a check that evaluates to null passes, so a missing body must count as empty.
  check (decision is not null or coalesce(char_length(btrim(body)), 0) >= 1)
);

create index review_comments_review_id_created_at_idx on public.review_comments (review_id, created_at);

-- Existing posts become revision 1 of review 1, in the state they are in now.
insert into public.prompt_reviews (post_id, number, status, opened_by, created_at, closed_at, closed_by)
select
  id,
  1,
  case status when 'pending' then 'open' else status end,
  author_id,
  created_at,
  case when status = 'pending' then null else coalesce(reviewed_at, now()) end,
  (select user_id from public.profiles where user_id = reviewed_by)
from public.posted_prompts;

insert into public.prompt_revisions (
  post_id, review_id, number, created_by, created_at, kind, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count
)
select
  p.id, r.id, 1, p.author_id, p.created_at, p.kind, p.file_name, p.title, p.tagline, p.summary, p.category,
  p.meant_for, p.highlights, p.usage_steps, p.works_with, p.content, p.preview_line_count
from public.posted_prompts p
join public.prompt_reviews r on r.post_id = p.id;

update public.posted_prompts p
set live_revision_id = v.id
from public.prompt_revisions v
where v.post_id = p.id and p.status = 'approved';

insert into public.review_comments (review_id, post_id, author_id, body, decision, created_at)
select r.id, p.id, r.closed_by, p.review_note, p.status, r.closed_at
from public.posted_prompts p
join public.prompt_reviews r on r.post_id = p.id
where p.status in ('approved', 'rejected');

alter table public.prompt_reviews enable row level security;
alter table public.prompt_revisions enable row level security;
alter table public.review_comments enable row level security;

-- Reviews are private to the post's authors and the admins, even once the post is public.
create policy "Authors and admins read reviews"
  on public.prompt_reviews for select
  to authenticated
  using (public.is_post_author(post_id) or public.is_admin());

create policy "Authors and admins read revisions"
  on public.prompt_revisions for select
  to authenticated
  using (public.is_post_author(post_id) or public.is_admin());

create policy "Authors and admins read review comments"
  on public.review_comments for select
  to authenticated
  using (public.is_post_author(post_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Invite links
-- ---------------------------------------------------------------------------

-- Only a hash of each token is stored, so a leaked table doesn't hand out working links.
-- RLS on with no policies: only the functions below read or write it.
create table public.post_invites (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.profiles (user_id) on delete set null,
  used_at timestamptz
);

alter table public.post_invites enable row level security;

-- ---------------------------------------------------------------------------
-- 6. A new post starts its first review
-- ---------------------------------------------------------------------------

-- The poster becomes the owner, and the post becomes revision 1 of review 1. The author needs a
-- profile (post_authors references it): the app asks for a username before showing the form.
create function public.start_post_review()
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
    meant_for, highlights, usage_steps, works_with, content, preview_line_count
  )
  values (
    new.id, v_review_id, 1, new.author_id, new.kind, new.file_name, new.title, new.tagline, new.summary,
    new.category, new.meant_for, new.highlights, new.usage_steps, new.works_with, new.content,
    new.preview_line_count
  );
  return null;
end;
$$;

create trigger posted_prompts_start_review
  after insert on public.posted_prompts
  for each row execute function public.start_post_review();

-- ---------------------------------------------------------------------------
-- 7. Actions (called from the app with supabase.rpc())
-- ---------------------------------------------------------------------------
--
-- Errors carry their own SQLSTATE so the app can tell them apart:
--   MD401 not signed in            MD403 not allowed (not an author, owner or admin)
--   MD404 not found                MD409 wrong state (review closed, post rejected…)
--   MD422 invalid input            MD428 the caller has no username yet

-- The caller, who must be signed in and have a username (comments and revisions show it).
create function public.require_profile()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Sign in first' using errcode = 'MD401';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception 'Pick a username first' using errcode = 'MD428';
  end if;
  return v_user;
end;
$$;

-- Number of lines of a file, counted like the app does (a final newline doesn't add a line).
create function public.count_file_lines(p_content text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select cardinality(string_to_array(regexp_replace(replace(p_content, E'\r\n', E'\n'), E'\n$', ''), E'\n'));
$$;

-- An author pushes a new version. It joins the review in progress (and answers a change request),
-- or, for an approved post with none in progress, opens a new review against the live version.
-- Returns the new revision's number.
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
  p_note text default null
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
    meant_for, highlights, usage_steps, works_with, content, preview_line_count
  )
  values (
    p_post_id, v_review.id, v_number, v_user, p_kind, p_file_name, p_title, p_tagline, p_summary, p_category,
    p_meant_for, p_highlights, p_usage_steps, p_works_with, p_content, p_preview_line_count
  );

  -- A post that was never approved shows its latest revision (to its authors and admins).
  if v_post.status = 'pending' then
    update public.posted_prompts
    set kind = p_kind, file_name = p_file_name, title = p_title, tagline = p_tagline, summary = p_summary,
        category = p_category, meant_for = p_meant_for, highlights = p_highlights, usage_steps = p_usage_steps,
        works_with = p_works_with, content = p_content, preview_line_count = p_preview_line_count
    where id = p_post_id;
  end if;

  if v_note is not null then
    insert into public.review_comments (review_id, post_id, author_id, body)
    values (v_review.id, p_post_id, v_user, v_note);
  end if;

  return v_number;
end;
$$;

-- A comment in a review in progress, by an author or an admin: on the whole review, or on one
-- line of one of the review's revisions.
create function public.add_review_comment(
  p_review_id uuid,
  p_body text,
  p_revision_id uuid default null,
  p_line_number integer default null
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
  v_body text := btrim(coalesce(p_body, ''));
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

  if p_revision_id is not null then
    select * into v_revision from public.prompt_revisions where id = p_revision_id and review_id = p_review_id;
    if not found then
      raise exception 'That revision is not part of this review' using errcode = 'MD422';
    end if;
    if p_line_number not between 1 and public.count_file_lines(v_revision.content) then
      raise exception 'That line is not in the file' using errcode = 'MD422';
    end if;
  end if;

  insert into public.review_comments (review_id, post_id, author_id, body, revision_id, line_number)
  values (p_review_id, v_review.post_id, v_user, v_body, p_revision_id, p_line_number)
  returning id into v_comment_id;
  return v_comment_id;
end;
$$;

-- An admin closes or answers a review in progress:
--   approved           the review's latest revision becomes the live version (the post goes public)
--   changes_requested  back to the authors; their next push reopens it
--   rejected           closed for good; a post that was never approved is rejected with it, an
--                      approved one keeps its live version
-- A message is required except when approving. Admins may review their own posts: the site has a
-- single admin for now.
create function public.decide_review(p_review_id uuid, p_decision text, p_body text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_review public.prompt_reviews;
  v_revision public.prompt_revisions;
  v_body text := nullif(btrim(p_body), '');
begin
  if not public.is_admin() then
    raise exception 'Only admins review posts' using errcode = 'MD403';
  end if;
  if p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Unknown decision' using errcode = 'MD422';
  end if;
  if p_decision <> 'approved' and v_body is null then
    raise exception 'Explain what needs to change' using errcode = 'MD422';
  end if;
  if char_length(v_body) > 5000 then
    raise exception 'The message is too long' using errcode = 'MD422';
  end if;

  select * into v_review from public.prompt_reviews where id = p_review_id for update;
  if not found then
    raise exception 'Review not found' using errcode = 'MD404';
  end if;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;

  if p_decision = 'approved' then
    select * into v_revision
    from public.prompt_revisions
    where review_id = p_review_id
    order by number desc
    limit 1;

    update public.posted_prompts
    set kind = v_revision.kind, file_name = v_revision.file_name, title = v_revision.title,
        tagline = v_revision.tagline, summary = v_revision.summary, category = v_revision.category,
        meant_for = v_revision.meant_for, highlights = v_revision.highlights,
        usage_steps = v_revision.usage_steps, works_with = v_revision.works_with,
        content = v_revision.content, preview_line_count = v_revision.preview_line_count,
        status = 'approved', review_note = null, live_revision_id = v_revision.id
    where id = v_review.post_id;
  elsif p_decision = 'rejected' then
    update public.posted_prompts
    set status = 'rejected', review_note = v_body
    where id = v_review.post_id and status = 'pending';
  end if;

  update public.prompt_reviews
  set status = p_decision,
      closed_at = case when p_decision = 'changes_requested' then null else now() end,
      closed_by = case when p_decision = 'changes_requested' then null else v_user end
  where id = p_review_id;

  insert into public.review_comments (review_id, post_id, author_id, body, decision)
  values (p_review_id, v_review.post_id, v_user, v_body, p_decision);
end;
$$;

-- The owner withdraws a review in progress. A post that was never approved is withdrawn with it
-- (it stays visible to its authors); an approved post keeps its live version.
create function public.withdraw_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_review public.prompt_reviews;
begin
  select * into v_review from public.prompt_reviews where id = p_review_id for update;
  if not found or not public.is_post_owner(v_review.post_id) then
    raise exception 'Only the post''s owner can withdraw it' using errcode = 'MD403';
  end if;
  if v_review.status not in ('open', 'changes_requested') then
    raise exception 'This review is closed' using errcode = 'MD409';
  end if;

  update public.prompt_reviews set status = 'withdrawn', closed_at = now(), closed_by = v_user where id = p_review_id;
  update public.posted_prompts set status = 'withdrawn' where id = v_review.post_id and status = 'pending';
  insert into public.review_comments (review_id, post_id, author_id, decision)
  values (p_review_id, v_review.post_id, v_user, 'withdrawn');
end;
$$;

-- The owner adds a co-author by username. Returns 'added', 'already_author' or 'not_found'.
create function public.add_post_coauthor(p_post_id uuid, p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coauthor uuid;
begin
  perform public.require_profile();
  if not public.is_post_owner(p_post_id) then
    raise exception 'Only the post''s owner can add co-authors' using errcode = 'MD403';
  end if;

  select user_id into v_coauthor from public.profiles where lower(username) = lower(ltrim(btrim(p_username), '@'));
  if not found then
    return 'not_found';
  end if;
  if exists (select 1 from public.post_authors where post_id = p_post_id and user_id = v_coauthor) then
    return 'already_author';
  end if;

  insert into public.post_authors (post_id, user_id, role) values (p_post_id, v_coauthor, 'coauthor');
  return 'added';
end;
$$;

-- The owner removes a co-author, or a co-author leaves. The owner can't be removed.
create function public.remove_post_author(p_post_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
begin
  if not (public.is_post_owner(p_post_id) or v_user = p_user_id) then
    raise exception 'Only the owner can remove co-authors' using errcode = 'MD403';
  end if;
  delete from public.post_authors where post_id = p_post_id and user_id = p_user_id and role = 'coauthor';
  if not found then
    raise exception 'That account is not a co-author of this post' using errcode = 'MD404';
  end if;
end;
$$;

-- The owner creates a one-time invite link, valid for 7 days. Returns the token (shown once).
create function public.create_post_invite(p_post_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.is_post_owner(p_post_id) then
    raise exception 'Only the post''s owner can invite co-authors' using errcode = 'MD403';
  end if;
  insert into public.post_invites (post_id, token_hash, created_by)
  values (p_post_id, extensions.digest(v_token, 'sha256'), v_user);
  return v_token;
end;
$$;

-- What an invite link points to, for the page that asks the visitor to accept it.
-- invite_state: 'valid', 'used' or 'expired'; no row when the token is unknown.
create function public.get_post_invite(p_token text)
returns table (slug text, title text, invite_state text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.slug,
    p.title,
    case
      when i.used_at is not null then 'used'
      when i.expires_at <= now() then 'expired'
      else 'valid'
    end
  from public.post_invites i
  join public.posted_prompts p on p.id = i.post_id
  where i.token_hash = extensions.digest(p_token, 'sha256')
    and (select auth.uid()) is not null;
$$;

-- Accepts an invite: the caller joins the post as co-author. Returns the post's slug.
-- Someone who is already an author keeps their role and leaves the invite unused.
create function public.accept_post_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_invite public.post_invites;
  v_slug text;
begin
  select * into v_invite
  from public.post_invites
  where token_hash = extensions.digest(p_token, 'sha256')
  for update;
  if not found then
    raise exception 'Invite not found' using errcode = 'MD404';
  end if;

  select slug into v_slug from public.posted_prompts where id = v_invite.post_id;
  if exists (select 1 from public.post_authors where post_id = v_invite.post_id and user_id = v_user) then
    return v_slug;
  end if;
  if v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite was already used or has expired' using errcode = 'MD409';
  end if;

  insert into public.post_authors (post_id, user_id, role) values (v_invite.post_id, v_user, 'coauthor');
  update public.post_invites set used_by = v_user, used_at = now() where id = v_invite.id;
  return v_slug;
end;
$$;

-- Functions are executable by everyone by default. The checks inside each one would refuse
-- anonymous callers anyway; revoking keeps them out of the anonymous API surface entirely.
-- is_post_author and is_post_owner stay callable: the select policies evaluate them for every reader.
revoke execute on function
  public.create_profile_for_new_user(),
  public.start_post_review(),
  public.require_profile(),
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text),
  public.add_review_comment(uuid, text, uuid, integer),
  public.decide_review(uuid, text, text),
  public.withdraw_review(uuid),
  public.add_post_coauthor(uuid, text),
  public.remove_post_author(uuid, uuid),
  public.create_post_invite(uuid),
  public.get_post_invite(text),
  public.accept_post_invite(text)
from public, anon;

grant execute on function
  public.push_revision(uuid, text, text, text, text, text, text, text[], text[], text[], text[], text, integer, text),
  public.add_review_comment(uuid, text, uuid, integer),
  public.decide_review(uuid, text, text),
  public.withdraw_review(uuid),
  public.add_post_coauthor(uuid, text),
  public.remove_post_author(uuid, uuid),
  public.create_post_invite(uuid),
  public.get_post_invite(text),
  public.accept_post_invite(text)
to authenticated;

-- Internal helpers: called only inside the functions above (which run as their owner) or by
-- triggers. Supabase grants new functions to authenticated explicitly, so revoke that too.
revoke execute on function
  public.create_profile_for_new_user(),
  public.start_post_review(),
  public.require_profile()
from authenticated;
