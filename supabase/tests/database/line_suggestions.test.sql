-- Suggested changes on a revision's lines, accepted or rejected by the post's authors. Run with
-- `npm run db:test` (needs the local stack). Everything runs in one transaction that is rolled back at the end.
begin;
select plan(27);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'sugg-owner@test.dev', '{"username": "sugg-owner"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'sugg-admin@test.dev', '{"username": "sugg-admin"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'sugg-stranger@test.dev', '{"username": "sugg-stranger"}');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000c2');

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

-- Helpers read as the database owner, whatever role the test runs as.
create function pg_temp.review_id() returns uuid language sql security definer as $$
  select r.id from public.prompt_reviews r join public.posted_prompts p on p.id = r.post_id where p.slug = 'sugg-post';
$$;
create function pg_temp.revision_id(p_number integer) returns uuid language sql security definer as $$
  select v.id from public.prompt_revisions v join public.posted_prompts p on p.id = v.post_id
  where p.slug = 'sugg-post' and v.number = p_number;
$$;
create function pg_temp.suggestion_id(p_body text) returns uuid language sql security definer as $$
  select id from public.review_comments where body = p_body and suggestion is not null;
$$;
grant execute on function pg_temp.review_id(), pg_temp.revision_id(integer), pg_temp.suggestion_id(text)
  to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count
) values (
  'sugg-post', '00000000-0000-0000-0000-0000000000c1', '@sugg-owner', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'code-conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{}', E'line 1\nline 2\nline 3\nline 4\nline 5\n', 5
);

-- Suggesting
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select lives_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'A', pg_temp.revision_id(1), 2, 'new', '{"line two"}') $$,
  'an admin suggests a change to one line'
);
select lives_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'B', pg_temp.revision_id(1), 4, 'new', '{"lines 4 and 5"}', 5) $$,
  'an admin suggests replacing a range of lines'
);
select throws_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'Same', pg_temp.revision_id(1), 3, 'new', '{"line 3"}') $$,
  'MD422', null, 'a suggestion that changes nothing is refused'
);
select throws_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'Past the end', pg_temp.revision_id(1), 4, 'new', '{x}', 6) $$,
  'MD422', null, 'a range past the end of the file is refused'
);
select throws_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'Range', pg_temp.revision_id(1), 2, 'new', null, 3) $$,
  'MD422', null, 'only suggestions span several lines'
);
select throws_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'Whole', null, null, 'new', '{x}') $$,
  'MD422', null, 'a suggestion needs a line'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$ select public.add_review_comment(pg_temp.review_id(), 'Mine', pg_temp.revision_id(1), 1, 'new', '{x}') $$,
  'MD404', null, 'someone outside the post can''t suggest'
);

-- Only authors answer
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok(
  $$ select public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(jsonb_build_object('id', pg_temp.suggestion_id('A')))) $$,
  'MD403', null, 'an admin who isn''t an author can''t accept'
);
select throws_ok(
  $$ select public.reject_suggestion(pg_temp.suggestion_id('A')) $$,
  'MD403', null, 'an admin who isn''t an author can''t reject'
);

-- Accepting two at once, the first one edited
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select is(
  public.apply_suggestions(
    pg_temp.review_id(),
    jsonb_build_array(
      jsonb_build_object('id', pg_temp.suggestion_id('A'), 'lines', jsonb_build_array('line 2 edited')),
      jsonb_build_object('id', pg_temp.suggestion_id('B'))
    ),
    'Took both'
  ),
  2,
  'accepting pushes one new revision'
);
select is(
  (select content from public.prompt_revisions where id = pg_temp.revision_id(2)),
  E'line 1\nline 2 edited\nline 3\nlines 4 and 5\n',
  'both changes are applied, the edited one as edited, keeping the final newline'
);
select is(
  (select title from public.prompt_revisions where id = pg_temp.revision_id(2)),
  'Test prompt',
  'the listing carries over'
);
select is(
  (select array_agg(suggestion_state order by body) from public.review_comments where suggestion is not null),
  '{accepted,accepted}'::text[],
  'both suggestions are accepted'
);
select is(
  (select applied_suggestion from public.review_comments where id = pg_temp.suggestion_id('A')),
  '{"line 2 edited"}'::text[],
  'the edited suggestion records what was applied'
);
select is(
  (select applied_suggestion from public.review_comments where id = pg_temp.suggestion_id('B')),
  null,
  'a suggestion taken as written records nothing extra'
);
select is(
  (select applied_revision_id from public.review_comments where id = pg_temp.suggestion_id('B')),
  pg_temp.revision_id(2),
  'the suggestion points to the revision it went into'
);
select is(
  (select count(*)::integer from public.review_comments where body = 'Took both' and suggestion is null),
  1,
  'the note joins the conversation'
);
select throws_ok(
  $$ select public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(jsonb_build_object('id', pg_temp.suggestion_id('A')))) $$,
  'MD409', null, 'an answered suggestion can''t be applied again'
);

-- Suggestions on an earlier revision
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select public.add_review_comment(pg_temp.review_id(), 'C', pg_temp.revision_id(1), 1, 'new', '{"first line"}');
select public.add_review_comment(pg_temp.review_id(), 'D', pg_temp.revision_id(1), 2, 'new', '{"second line"}');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select is(
  public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(jsonb_build_object('id', pg_temp.suggestion_id('C')))),
  3,
  'a suggestion on an earlier revision applies while its lines are unchanged'
);
select throws_ok(
  $$ select public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(jsonb_build_object('id', pg_temp.suggestion_id('D')))) $$,
  'MD409', null, 'a suggestion whose lines changed is outdated'
);
select lives_ok(
  $$ select public.reject_suggestion(pg_temp.suggestion_id('D'), 'Already fixed differently') $$,
  'an outdated suggestion can be rejected, with a reply'
);
select is(
  (select line_number from public.review_comments where body = 'Already fixed differently'),
  2,
  'the reply joins the suggestion''s line thread'
);

-- Overlaps and an empty file
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select public.add_review_comment(pg_temp.review_id(), 'E', pg_temp.revision_id(3), 3, 'new', '{x}');
select public.add_review_comment(pg_temp.review_id(), 'F', pg_temp.revision_id(3), 3, 'new', '{y}', 4);
select public.add_review_comment(pg_temp.review_id(), 'G', pg_temp.revision_id(3), 1, 'new', '{}', 4);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(
       jsonb_build_object('id', pg_temp.suggestion_id('E')), jsonb_build_object('id', pg_temp.suggestion_id('F')))) $$,
  'MD422', null, 'two suggestions on the same lines can''t be applied together'
);
select throws_ok(
  $$ select public.apply_suggestions(pg_temp.review_id(), jsonb_build_array(jsonb_build_object('id', pg_temp.suggestion_id('G')))) $$,
  'MD422', null, 'a suggestion can''t leave the file empty'
);

-- Locating lines that moved
reset role;
select is(public.locate_suggestion('{b}', 1, '{a,b,c}'), 2, 'lines that moved are found where they are now');
select is(public.locate_suggestion('{b}', 1, '{b,a,b}'), 1, 'the same line numbers win when they still match');
select is(public.locate_suggestion('{b}', 2, '{b,a,b,a}'), null, 'lines found more than once elsewhere are outdated');

select * from finish();
rollback;
