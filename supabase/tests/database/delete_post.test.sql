-- The owner deletes a post for good. Run with `npm run db:test` (needs the local stack). Everything runs in
-- one transaction that is rolled back at the end.
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'del-owner@test.dev', '{"username": "del-owner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'del-coauthor@test.dev', '{"username": "del-coauthor"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'del-stranger@test.dev', '{"username": "del-stranger"}');

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.post_id() returns uuid language sql security definer as $$
  select id from public.posted_prompts where slug = 'del-post';
$$;
grant execute on function pg_temp.post_id() to authenticated;

-- A post with an example image, a second revision with another, a co-author and a comment.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count, output_examples
) values (
  'del-post', '00000000-0000-0000-0000-0000000000d1', '@del-owner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'frontend', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{}', E'line 1\n', 5,
  '[{"path": "00000000-0000-0000-0000-0000000000d1/11111111-1111-1111-1111-111111111111.png", "caption": "One"}]'
);
select public.push_revision(
  pg_temp.post_id(), 'prompt', 'test.md', 'Test prompt', 'A tagline long enough', 'A summary that is long enough.',
  'frontend', '{Web apps}', '{One highlight}', '{Drop it in}', '{}', E'line 1 changed\n', 5, 'Second', '{}', '{}',
  '[{"path": "00000000-0000-0000-0000-0000000000d1/22222222-2222-2222-2222-222222222222.png", "caption": "Two"}]'
);
select public.add_post_coauthor(pg_temp.post_id(), 'del-coauthor');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$ select public.delete_post(pg_temp.post_id()) $$, 'MD404', null, 'someone outside the post can''t delete it');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select throws_ok($$ select public.delete_post(pg_temp.post_id()) $$, 'MD403', null, 'a co-author can''t delete it');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ select public.delete_post('00000000-0000-0000-0000-000000000000') $$, 'MD404', null, 'an unknown post is not found'
);
select is(
  (select array_agg(path order by path) from unnest(public.delete_post(pg_temp.post_id())) path),
  '{00000000-0000-0000-0000-0000000000d1/11111111-1111-1111-1111-111111111111.png,00000000-0000-0000-0000-0000000000d1/22222222-2222-2222-2222-222222222222.png}'::text[],
  'the owner deletes it and gets back every example image it used'
);

reset role;
select is((select count(*)::integer from public.posted_prompts where slug = 'del-post'), 0, 'the post is gone');
select is(
  (select count(*)::integer from public.prompt_revisions r
   where not exists (select 1 from public.posted_prompts p where p.id = r.post_id)),
  0,
  'its revisions are gone'
);
select is(
  (select count(*)::integer from public.prompt_reviews r
   where not exists (select 1 from public.posted_prompts p where p.id = r.post_id)),
  0,
  'its reviews are gone'
);
select is(
  (select count(*)::integer from public.review_comments c
   where not exists (select 1 from public.posted_prompts p where p.id = c.post_id)),
  0,
  'its comments are gone'
);
select is(
  (select count(*)::integer from public.post_authors where user_id = '00000000-0000-0000-0000-0000000000d2'),
  0,
  'its co-authors are no longer linked to it'
);

select * from finish();
rollback;
