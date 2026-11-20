-- Star ratings (1 to 5) on posted prompts.
--
-- Any signed-in user may rate an approved post once, change their stars, or remove them; the post's
-- authors may not rate their own post. Each rating is private to its author: the public only sees
-- the totals, kept on posted_prompts (rating_count, rating_sum) so the cached public read of a post
-- (and the API) gets them with no extra query. A trigger recomputes them from prompt_ratings after
-- every change to that table, in the same transaction, so they can't drift; that includes ratings
-- removed by a cascade when an account is deleted.
--
-- Writes go through rate_prompt() only: the table has a select policy for the caller's own rows
-- and no insert, update or delete policy.

alter table public.posted_prompts
  add column rating_count integer not null default 0 check (rating_count >= 0),
  add column rating_sum integer not null default 0 check (rating_sum >= 0);

create table public.prompt_ratings (
  post_id uuid not null references public.posted_prompts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index prompt_ratings_user_id_idx on public.prompt_ratings (user_id);

alter table public.prompt_ratings enable row level security;

create policy "Users read their own ratings"
  on public.prompt_ratings for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Recomputes the totals of the post a rating belongs to. Runs as the table owner, so it can update
-- posted_prompts (whose update policy is admins only). When a post is deleted its ratings go by
-- cascade; the update then matches no row, which is harmless.
create function public.refresh_post_rating_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posted_prompts
  set
    rating_count = (select count(*)::integer from public.prompt_ratings where post_id = v_post_id),
    rating_sum = (select coalesce(sum(stars), 0)::integer from public.prompt_ratings where post_id = v_post_id)
  where id = v_post_id;
  return null;
end;
$$;

create trigger prompt_ratings_refresh_totals
  after insert or update or delete on public.prompt_ratings
  for each row execute function public.refresh_post_rating_totals();

-- Errors (same convention as the review functions):
--   MD401 not signed in   MD404 no approved post with this slug   MD403 the caller is one of its authors
--   MD422 stars outside 1 to 5
-- p_stars null removes the caller's rating (a no-op when there is none).
create function public.rate_prompt(p_slug text, p_stars smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_post_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in first' using errcode = 'MD401';
  end if;
  if p_stars is not null and p_stars not between 1 and 5 then
    raise exception 'Stars must be between 1 and 5' using errcode = 'MD422';
  end if;

  -- Locks the post, so concurrent ratings recompute its totals one after the other.
  select id into v_post_id from public.posted_prompts where slug = p_slug and status = 'approved' for update;
  if v_post_id is null then
    raise exception 'Prompt not found' using errcode = 'MD404';
  end if;
  if public.is_post_author(v_post_id) then
    raise exception 'Authors can''t rate their own prompt' using errcode = 'MD403';
  end if;

  -- The trigger above updates the post's totals.
  if p_stars is null then
    delete from public.prompt_ratings where post_id = v_post_id and user_id = v_user;
  else
    insert into public.prompt_ratings (post_id, user_id, stars)
    values (v_post_id, v_user, p_stars)
    on conflict (post_id, user_id) do update set stars = excluded.stars, updated_at = now();
  end if;
end;
$$;

-- Only the trigger runs refresh_post_rating_totals(); rate_prompt() is for signed-in users.
revoke execute on function public.refresh_post_rating_totals() from public, anon, authenticated;
revoke execute on function public.rate_prompt(text, smallint) from public, anon;
grant execute on function public.rate_prompt(text, smallint) to authenticated;
