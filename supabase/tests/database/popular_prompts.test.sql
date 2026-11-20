-- The landing page's ranking. Run with `npm run db:test` (needs the local stack).
-- Everything runs in one transaction that is rolled back at the end.
begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'popular-owner@test.dev', '{"username": "popularowner"}');

-- Posts p1 (oldest) to p5 (newest), all approved but p5.
insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count, created_at
)
select
  'popular-p' || n, '00000000-0000-0000-0000-0000000000c1', '@popularowner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5, now() - make_interval(days => 10 - n)
from generate_series(1, 5) as n;
update public.posted_prompts set status = 'approved' where slug in ('popular-p1', 'popular-p2', 'popular-p3', 'popular-p4');

-- The local database may hold other posts, so keep only these, in the function's order.
create function pg_temp.ranking() returns text[] language sql as $$
  select array_agg(slug order by ordinality)
  from public.popular_prompts(50) with ordinality
  where slug like 'popular-p%';
$$;

select is(
  pg_temp.ranking(),
  array['popular-p4', 'popular-p3', 'popular-p2', 'popular-p1'],
  'with no ratings, the newest approved posts come first'
);
select ok(
  not exists (select 1 from public.popular_prompts(50) where slug = 'popular-p5'),
  'a post in review is never listed'
);

-- p1: 4.0 from 1 rating, p2: 4.5 (4 + 5), p3: 4.0 from 2 ratings; p4 unrated.
update public.posted_prompts set rating_count = 1, rating_sum = 4 where slug = 'popular-p1';
update public.posted_prompts set rating_count = 2, rating_sum = 9 where slug = 'popular-p2';
update public.posted_prompts set rating_count = 2, rating_sum = 8 where slug = 'popular-p3';

select is(
  pg_temp.ranking(),
  array['popular-p2', 'popular-p3', 'popular-p1', 'popular-p4'],
  'highest average first, equal averages newest first, unrated posts last'
);

set local role anon;
select is(
  (select count(*)::integer from public.popular_prompts(2)),
  2,
  'visitors can call it, and the limit applies'
);
reset role;

select is(
  (select count(*)::integer from public.popular_prompts(-1)),
  0,
  'a negative limit lists nothing'
);

select * from finish();
rollback;
