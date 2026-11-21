-- Output examples (screenshots): the list's shape check, and the list through posting, a new revision and
-- approval. Run with `npm run db:test` (needs the local stack). Everything runs in one transaction that is rolled back.
begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'examples-owner@test.dev', '{"username": "examplesowner"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'examples-admin@test.dev', '{"username": "examplesadmin"}');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000e2');

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.insert_post(p_slug text, p_examples jsonb) returns void
language sql as $$
  insert into public.posted_prompts (
    slug, author_id, author_handle, file_name, title, tagline, summary, category, meant_for, highlights,
    usage_steps, works_with, output_examples, content, preview_line_count
  ) values (
    p_slug, '00000000-0000-0000-0000-0000000000e1', '@examplesowner', 'test.md', 'Test prompt', 'A tagline long enough',
    'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}', '{Drop it in}', '{Cursor}',
    p_examples, E'line 1\nline 2\nline 3\n', 5
  );
$$;
grant execute on function pg_temp.insert_post(text, jsonb) to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');

select throws_ok(
  $$ select pg_temp.insert_post('not-a-list', '{"path": "x"}') $$,
  '23514', null, 'examples must be a list'
);
select throws_ok(
  $$ select pg_temp.insert_post('bad-path', '[{"path": "../secret.png", "caption": ""}]') $$,
  '23514', null, 'a path must be <folder>/<file> in the shape the app uploads'
);
select throws_ok(
  $$ select pg_temp.insert_post('bad-type', '[{"path": "00000000-0000-0000-0000-0000000000e1/11111111-1111-1111-1111-111111111111.svg", "caption": ""}]') $$,
  '23514', null, 'only png, jpg and webp files are listed'
);
select throws_ok(
  $$ select pg_temp.insert_post('too-many', (select jsonb_agg(jsonb_build_object(
       'path', '00000000-0000-0000-0000-0000000000e1/' || gen_random_uuid() || '.png', 'caption', ''))
     from generate_series(1, 7))) $$,
  '23514', null, 'a post holds at most six examples'
);
select lives_ok(
  $$ select pg_temp.insert_post('examples-post',
       '[{"path": "00000000-0000-0000-0000-0000000000e1/11111111-1111-1111-1111-111111111111.png", "caption": "A form"}]') $$,
  'a post saves its examples'
);
reset role;

select is(
  (select r.output_examples -> 0 ->> 'caption'
   from public.prompt_revisions r join public.posted_prompts p on p.id = r.post_id
   where p.slug = 'examples-post' and r.number = 1),
  'A form',
  'revision 1 copies the examples'
);

-- An approved post keeps its live examples until a change is approved.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select public.decide_review(
  (select id from public.prompt_reviews where post_id = (select id from public.posted_prompts where slug = 'examples-post')),
  'approved'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select public.push_revision(
  (select id from public.posted_prompts where slug = 'examples-post'), 'prompt', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\n', 5, null, '{}', '{}',
  '[{"path": "00000000-0000-0000-0000-0000000000e1/33333333-3333-3333-3333-333333333333.webp", "caption": "A table"}]'
);
reset role;
select is(
  (select output_examples -> 0 ->> 'caption' from public.posted_prompts where slug = 'examples-post'),
  'A form',
  'an unapproved change leaves the live examples alone'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select public.decide_review(
  (select id from public.prompt_reviews
   where post_id = (select id from public.posted_prompts where slug = 'examples-post') and status = 'open'),
  'approved'
);
reset role;
select is(
  (select output_examples -> 0 ->> 'caption' from public.posted_prompts where slug = 'examples-post'),
  'A table',
  'approving the change makes its examples live'
);

select * from finish();
rollback;
