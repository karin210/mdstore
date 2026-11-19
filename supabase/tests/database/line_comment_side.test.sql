-- Line comments on either side of a revision's diff (the Changes tab). Run with `npm run db:test`
-- (needs the local stack). Everything runs in one transaction that is rolled back at the end.
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'side-owner@test.dev', '{"username": "side-owner"}');

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Revision 1 has 3 lines (the post), revision 2 has 4 (one pushed to the same review).
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count
) values (
  'side-post', '00000000-0000-0000-0000-0000000000b1', '@side-owner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5
);
select public.push_revision(
  (select id from public.posted_prompts where slug = 'side-post'), 'prompt', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2 changed\nline 3\nline 4\n', 5
);

create temp table side_ids as
  select r.id as review_id,
    (select id from public.prompt_revisions where review_id = r.id and number = 1) as first_id,
    (select id from public.prompt_revisions where review_id = r.id and number = 2) as second_id
  from public.prompt_reviews r
  where r.post_id = (select id from public.posted_prompts where slug = 'side-post');
grant select on side_ids to authenticated;

select lives_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'Why remove it?', (select second_id from side_ids), 2, 'old') $$,
  'a removed line of revision 2 (line 2 of revision 1) takes a comment'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'Too far', (select second_id from side_ids), 4, 'old') $$,
  'MD422',
  null,
  'the old side counts lines in the previous revision, which has 3'
);
select lives_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'New line', (select second_id from side_ids), 4, 'new') $$,
  'the new side counts lines in the revision itself'
);
select lives_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'Default side', (select second_id from side_ids), 1) $$,
  'leaving the side out comments on the new side, as before'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'Nothing before', (select first_id from side_ids), 1, 'old') $$,
  'MD422',
  null,
  'the first revision of a new post has no old side'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'Sideways', (select second_id from side_ids), 1, 'middle') $$,
  'MD422',
  null,
  'an unknown side is refused'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from side_ids), 'No line', null, null, 'old') $$,
  'MD422',
  null,
  'a review comment has no side'
);

reset role;
select is(
  (select line_side from public.review_comments where body = 'Why remove it?'),
  'old',
  'the comment records its side'
);
select is(
  (select line_side from public.review_comments where body = 'Default side'),
  'new',
  'the default side is recorded as new'
);

select * from finish();
rollback;
