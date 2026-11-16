-- Review workflow: who can see, push, comment, decide and invite. Run with `npm run db:test`
-- (needs the local stack). Everything runs in one transaction that is rolled back at the end.
begin;
select plan(40);

-- ---------------------------------------------------------------------------
-- Accounts (created as postgres, like the auth service does)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@test.dev', '{"username": "owner"}'),
  ('00000000-0000-0000-0000-00000000000b', 'coauthor@test.dev', '{"username": "coauthor"}'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@test.dev', '{"username": "admin"}'),
  ('00000000-0000-0000-0000-00000000000d', 'stranger@test.dev', '{"username": "stranger"}'),
  ('00000000-0000-0000-0000-00000000000e', 'nameless@test.dev', '{}'),
  ('00000000-0000-0000-0000-00000000000f', 'clash@test.dev', '{"username": "OWNER"}');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000c');

select is(
  (select count(*)::int from public.profiles where user_id::text like '00000000-0000-0000-0000-00000000000%'),
  4,
  'sign-up creates a profile from the username metadata, skipping a missing or case-insensitively taken one'
);

-- Switches the current identity, the way PostgREST does for each request.
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
end;
$$;

-- A valid listing for inserts and pushes.
create function pg_temp.insert_post(p_slug text, p_author uuid) returns uuid language sql as $$
  insert into public.posted_prompts (
    slug, author_id, author_handle, file_name, title, tagline, summary, category,
    meant_for, highlights, usage_steps, works_with, content, preview_line_count
  ) values (
    p_slug, p_author, '@owner', 'test.md', 'Test prompt', 'A tagline long enough', 'A summary that is long enough.',
    'conventions', '{Web apps}', '{One highlight}', '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5
  ) returning id;
$$;

create function pg_temp.push(p_post uuid, p_title text) returns integer language sql as $$
  select public.push_revision(
    p_post, 'prompt', 'test.md', p_title, 'A tagline long enough', 'A summary that is long enough.', 'conventions',
    '{Web apps}', '{One highlight}', '{Drop it in}', '{Cursor}', E'line 1\nline 2 changed\nline 3\nline 4\n', 5
  );
$$;

grant execute on function pg_temp.act_as(uuid), pg_temp.act_as_anon(), pg_temp.insert_post(text, uuid),
  pg_temp.push(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Posting starts review 1 with revision 1
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok(
  $$ select pg_temp.insert_post('nameless-post', '00000000-0000-0000-0000-00000000000e') $$,
  '23503',
  null,
  'an account without a username cannot post'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
create temp table ids as select pg_temp.insert_post('review-test', '00000000-0000-0000-0000-00000000000a') as post_id;
grant select on ids to anon, authenticated;

select is(
  (select role from public.post_authors where post_id = (select post_id from ids)),
  'owner',
  'the poster becomes the owner'
);
select is(
  (select status from public.prompt_reviews where post_id = (select post_id from ids)),
  'open',
  'the post opens review 1'
);
select is(
  (select number from public.prompt_revisions where post_id = (select post_id from ids)),
  1,
  'the post becomes revision 1'
);

-- ---------------------------------------------------------------------------
-- Visibility and co-authors
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.posted_prompts where slug = 'review-test'), 0, 'a stranger cannot see a pending post');
select is((select count(*)::int from public.prompt_reviews where post_id = (select post_id from ids)), 0, 'a stranger cannot see its review');
select throws_ok($$ select pg_temp.push((select post_id from ids), 'Stranger title') $$, 'MD403', null, 'a stranger cannot push');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.posted_prompts where slug = 'review-test'), 0, 'a co-author-to-be cannot see it yet');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is(public.add_post_coauthor((select post_id from ids), 'nobody-here'), 'not_found', 'adding an unknown username reports it');
select is(public.add_post_coauthor((select post_id from ids), '@CoAuthor'), 'added', 'the owner adds a co-author by username, any case, with or without @');
select is(public.add_post_coauthor((select post_id from ids), 'coauthor'), 'already_author', 'adding twice reports it');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.posted_prompts where slug = 'review-test'), 1, 'a co-author sees the pending post');
select throws_ok(
  $$ select public.add_post_coauthor((select post_id from ids), 'stranger') $$,
  'MD403',
  null,
  'a co-author cannot add authors'
);
select is(pg_temp.push((select post_id from ids), 'Second title'), 2, 'a co-author pushes revision 2');
select is(
  (select title from public.posted_prompts where slug = 'review-test'),
  'Second title',
  'a never-approved post shows its latest revision'
);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
create temp table review_ids as
  select r.id as review_id, v.id as revision_id
  from public.prompt_reviews r join public.prompt_revisions v on v.review_id = r.id and v.number = 2
  where r.post_id = (select post_id from ids);
grant select on review_ids to anon, authenticated;

select lives_ok(
  $$ select public.add_review_comment((select review_id from review_ids), 'Looks good', (select revision_id from review_ids), 4) $$,
  'an author comments on a line of a revision'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from review_ids), 'Out of range', (select revision_id from review_ids), 5) $$,
  'MD422',
  null,
  'a line past the end of the file is refused'
);
select throws_ok(
  $$ select public.add_review_comment((select review_id from review_ids), '   ') $$,
  'MD422',
  null,
  'an empty comment is refused'
);
select throws_ok(
  $$ insert into public.review_comments (review_id, post_id, author_id, body)
     values ((select review_id from review_ids), (select post_id from ids), '00000000-0000-0000-0000-00000000000a', 'direct') $$,
  '42501',
  null,
  'comments cannot be inserted directly, only through the function'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.review_comments where post_id = (select post_id from ids)), 0, 'a stranger cannot read the comments');
select throws_ok(
  $$ select public.add_review_comment((select review_id from review_ids), 'Hi') $$,
  'MD404',
  null,
  'a stranger cannot comment'
);

-- ---------------------------------------------------------------------------
-- Decisions
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select public.decide_review((select review_id from review_ids), 'approved') $$,
  'MD403',
  null,
  'an author cannot approve'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.decide_review((select review_id from review_ids), 'changes_requested') $$,
  'MD422',
  null,
  'requesting changes needs a message'
);
select lives_ok(
  $$ select public.decide_review((select review_id from review_ids), 'changes_requested', 'Shorten line 2') $$,
  'an admin requests changes'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is(pg_temp.push((select post_id from ids), 'Third title'), 3, 'the owner answers with revision 3');
select is(
  (select status from public.prompt_reviews where id = (select review_id from review_ids)),
  'open',
  'pushing reopens the review'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.decide_review((select review_id from review_ids), 'approved') $$, 'an admin approves');

select pg_temp.act_as_anon();
select is(
  (select title from public.posted_prompts where slug = 'review-test'),
  'Third title',
  'once approved, the latest revision is public'
);
select is((select count(*)::int from public.prompt_reviews), 0, 'reviews stay private after approval');

-- ---------------------------------------------------------------------------
-- A proposed change to an approved post
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is(pg_temp.push((select post_id from ids), 'Fourth title'), 4, 'a co-author proposes revision 4');
select is(
  (select number from public.prompt_reviews where post_id = (select post_id from ids) and status = 'open'),
  2,
  'it opens review 2'
);

select pg_temp.act_as_anon();
select is(
  (select title from public.posted_prompts where slug = 'review-test'),
  'Third title',
  'the live version doesn''t change while the proposal is reviewed'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$ select public.decide_review(
       (select id from public.prompt_reviews where post_id = (select post_id from ids) and number = 2),
       'rejected',
       'Not needed'
     ) $$,
  'an admin rejects the proposal'
);
select is(
  (select status from public.posted_prompts where slug = 'review-test'),
  'approved',
  'rejecting a proposal keeps the post approved'
);

-- ---------------------------------------------------------------------------
-- Invites and leaving
-- ---------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
create temp table invite as select public.create_post_invite((select post_id from ids)) as token;
grant select on invite to anon, authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok(
  $$ select public.accept_post_invite((select token from invite)) $$,
  'MD428',
  null,
  'accepting needs a username'
);

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select is(
  (select invite_state from public.get_post_invite((select token from invite))),
  'valid',
  'the invite link is valid'
);
select is(public.accept_post_invite((select token from invite)), 'review-test', 'a stranger joins through the link');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.remove_post_author((select post_id from ids), '00000000-0000-0000-0000-00000000000a') $$,
  'MD403',
  null,
  'a co-author cannot remove the owner'
);
select lives_ok(
  $$ select public.remove_post_author((select post_id from ids), '00000000-0000-0000-0000-00000000000b') $$,
  'a co-author can leave'
);

select * from finish();
rollback;
