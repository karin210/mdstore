-- The models a post was tested against, through posting, a new revision and approval.
-- Run with `npm run db:test` (needs the local stack). Everything runs in one transaction that is rolled back.
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'models-owner@test.dev', '{"username": "modelsowner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'models-admin@test.dev', '{"username": "modelsadmin"}');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000d2');

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

create function pg_temp.insert_post(p_slug text, p_tested text[], p_recommended text[]) returns void
language sql as $$
  insert into public.posted_prompts (
    slug, author_id, author_handle, file_name, title, tagline, summary, category, meant_for, highlights,
    usage_steps, works_with, tested_models, recommended_models, content, preview_line_count
  ) values (
    p_slug, '00000000-0000-0000-0000-0000000000d1', '@modelsowner', 'test.md', 'Test prompt', 'A tagline long enough',
    'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}', '{Drop it in}', '{Cursor}',
    p_tested, p_recommended, E'line 1\nline 2\nline 3\n', 5
  );
$$;
grant execute on function pg_temp.insert_post(text, text[], text[]) to authenticated;

create function pg_temp.models_of(p_slug text) returns text language sql as $$
  select array_to_string(tested_models, ',') || ' / ' || array_to_string(recommended_models, ',')
  from public.posted_prompts where slug = p_slug;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');

select throws_ok(
  $$ select pg_temp.insert_post('bad-recommended', '{claude-opus-5-5}', '{gpt-5-1}') $$,
  '23514', null, 'a recommended model must also be a tested one'
);
select throws_ok(
  $$ select pg_temp.insert_post('bad-id', '{"Not An Id"}', '{}') $$,
  '23514', null, 'model ids must look like registry keys'
);
select lives_ok(
  $$ select pg_temp.insert_post('models-post', '{claude-opus-5-5,gpt-5-1}', '{claude-opus-5-5}') $$,
  'a post saves its tested and recommended models'
);
reset role;

select is(
  (select array_to_string(r.tested_models, ',') || ' / ' || array_to_string(r.recommended_models, ',')
   from public.prompt_revisions r join public.posted_prompts p on p.id = r.post_id
   where p.slug = 'models-post' and r.number = 1),
  'claude-opus-5-5,gpt-5-1 / claude-opus-5-5',
  'revision 1 copies the models'
);

-- A new revision while pending updates the post too.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select public.push_revision(
  (select id from public.posted_prompts where slug = 'models-post'), 'prompt', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\n', 5, null, '{gemini-3-pro}', '{gemini-3-pro}'
);
reset role;
select is(pg_temp.models_of('models-post'), 'gemini-3-pro / gemini-3-pro', 'a pending post shows its latest revision''s models');

-- Approval makes the revision live.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select public.decide_review(
  (select id from public.prompt_reviews where post_id = (select id from public.posted_prompts where slug = 'models-post')),
  'approved'
);
reset role;
select is(pg_temp.models_of('models-post'), 'gemini-3-pro / gemini-3-pro', 'approval keeps the approved revision''s models');

-- A change to an approved post waits for review: the live models stay until it is approved.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select public.push_revision(
  (select id from public.posted_prompts where slug = 'models-post'), 'prompt', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5, null, '{claude-haiku-5-5}', '{}'
);
reset role;
select is(pg_temp.models_of('models-post'), 'gemini-3-pro / gemini-3-pro', 'an unapproved change leaves the live models alone');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select public.decide_review(
  (select id from public.prompt_reviews
   where post_id = (select id from public.posted_prompts where slug = 'models-post') and status = 'open'),
  'approved'
);
reset role;
select is(pg_temp.models_of('models-post'), 'claude-haiku-5-5 / ', 'approving the change makes its models live');

select is(
  (select count(*)::integer from public.posted_prompts where slug = 'models-post' and tested_models = '{claude-haiku-5-5}'),
  1,
  'the post holds exactly the approved list'
);

select * from finish();
rollback;
