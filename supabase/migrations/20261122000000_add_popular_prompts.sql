-- The landing page's "most popular prompts": the approved posts ranked by rating.
--
-- Order: the highest average stars first; posts with the same average, newest first; then the
-- posts nobody has rated yet, newest first. With no ratings at all this is simply the newest posts.
-- The average is exact (rating_sum / rating_count), not the one-decimal figure the page shows.
--
-- security invoker (the default): row-level security applies to the caller, and the explicit
-- status filter keeps pending posts out even for their authors and admins.

create function public.popular_prompts(p_limit integer default 6)
returns setof public.posted_prompts
language sql
stable
set search_path = ''
as $$
  select *
  from public.posted_prompts
  where status = 'approved'
  order by
    rating_sum::numeric / nullif(rating_count, 0) desc nulls last,
    created_at desc
  limit least(greatest(p_limit, 0), 50);
$$;

grant execute on function public.popular_prompts(integer) to anon, authenticated;
