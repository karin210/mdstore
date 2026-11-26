-- Star ratings on posted prompts. Run with `npm run db:test` (needs the local stack).
-- Everything runs in one transaction that is rolled back at the end.
begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'rating-owner@test.dev', '{"username": "ratingowner"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'rater-one@test.dev', '{"username": "raterone"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'rater-two@test.dev', '{"username": "ratertwo"}');

insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count
) values (
  'rated-post', '00000000-0000-0000-0000-0000000000b1', '@ratingowner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'code-conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5
), (
  'pending-post', '00000000-0000-0000-0000-0000000000b1', '@ratingowner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'code-conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5
);
update public.posted_prompts set status = 'approved' where slug = 'rated-post';

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.totals(p_slug text) returns text language sql as $$
  select rating_count || '/' || rating_sum from public.posted_prompts where slug = p_slug;
$$;

-- Signed out
set local role anon;
select throws_ok($$ select public.rate_prompt('rated-post', 4::smallint) $$, '42501', null, 'visitors can''t rate');
reset role;

-- An author
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok($$ select public.rate_prompt('rated-post', 5::smallint) $$, 'MD403', null, 'authors can''t rate their own post');
reset role;

-- A reader
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok($$ select public.rate_prompt('pending-post', 4::smallint) $$, 'MD404', null, 'a post in review can''t be rated');
select throws_ok($$ select public.rate_prompt('no-such-post', 4::smallint) $$, 'MD404', null, 'an unknown slug can''t be rated');
select throws_ok($$ select public.rate_prompt('rated-post', 6::smallint) $$, 'MD422', null, 'six stars are refused');
select throws_ok($$ select public.rate_prompt('rated-post', 0::smallint) $$, 'MD422', null, 'zero stars are refused');
select lives_ok($$ select public.rate_prompt('rated-post', 4::smallint) $$, 'a reader rates an approved post');
select lives_ok($$ select public.rate_prompt('rated-post', 2::smallint) $$, 'rating again changes the stars');
select throws_ok(
  $$ insert into public.prompt_ratings (post_id, user_id, stars) select id, auth.uid(), 5 from public.posted_prompts where slug = 'rated-post' $$,
  '42501', null, 'the table can''t be written directly'
);
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select public.rate_prompt('rated-post', 5::smallint);
select is(
  (select count(*)::integer from public.prompt_ratings),
  1,
  'a reader only sees their own rating'
);
reset role;

select is(pg_temp.totals('rated-post'), '2/7', 'the post''s totals count one rating per reader');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.rate_prompt('rated-post', null);
select public.rate_prompt('rated-post', null);
reset role;
select is(pg_temp.totals('rated-post'), '1/5', 'removing a rating (twice) takes it out of the totals once');

delete from auth.users where id = '00000000-0000-0000-0000-0000000000b3';
select is(
  (select count(*)::integer from public.prompt_ratings),
  0,
  'a deleted account takes its ratings with it'
);
select is(pg_temp.totals('rated-post'), '0/0', 'and out of the post''s totals');

select * from finish();
rollback;
