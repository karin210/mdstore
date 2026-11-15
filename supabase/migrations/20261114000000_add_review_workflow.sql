-- Review workflow: every post starts as "pending" and only becomes public once an admin approves it.
--
--   author submits  -> status = 'pending'   (visible only to the author and to admins)
--   admin approves  -> status = 'approved'  (visible to everyone, appears at /prompts/[slug])
--   admin rejects   -> status = 'rejected'  (visible only to the author and to admins, with a note)

-- 1. What kind of listing it is, and where it is in the review.
alter table public.posted_prompts
  add column kind text not null default 'prompt'
    check (kind in ('prompt', 'skill')),
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column review_note text check (char_length(review_note) <= 1000),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

-- Rows that exist before this migration were published at once, so they stay public.
update public.posted_prompts set status = 'approved', reviewed_at = now() where status = 'pending';

-- The review queue ("pending, oldest first") and the public listing both filter on status.
create index posted_prompts_status_created_at_idx on public.posted_prompts (status, created_at);

-- 2. Who counts as an admin: rows in this table. Fill it by hand (SQL editor), never from the app.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- RLS on with no policies: the API can neither read nor write it. Only the SQL editor and
-- security definer functions (below) can.
alter table public.admins enable row level security;

-- security definer = runs with its owner's rights, so it can read admins even though RLS blocks callers.
-- An empty search_path stops a caller from shadowing tables with their own schema.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- 3. Replace the "everyone reads everything" policy and tighten the insert one.
drop policy "Posted prompts are readable by everyone" on public.posted_prompts;
drop policy "Signed-in users post their own prompts" on public.posted_prompts;

create policy "Approved prompts are public, authors see their own, admins see all"
  on public.posted_prompts for select
  to anon, authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = author_id
    or public.is_admin()
  );

-- A new post must be pending: authors cannot approve themselves by sending status = 'approved'.
create policy "Signed-in users submit their own prompts for review"
  on public.posted_prompts for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and status = 'pending'
    and review_note is null
    and reviewed_at is null
    and reviewed_by is null
  );

-- Only admins can change a row (approve, reject, edit). Authors cannot edit yet.
create policy "Admins review prompts"
  on public.posted_prompts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Stamp who reviewed and when, so nobody has to remember to set it.
create function public.stamp_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger posted_prompts_stamp_review
  before update on public.posted_prompts
  for each row execute function public.stamp_review();
