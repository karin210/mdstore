-- Changing a @username from /profile. Run with `npm run db:test` (needs the local stack).
-- Everything runs in one transaction that is rolled back at the end.
begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'renamer@test.dev', '{"username": "renamer"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'other@test.dev', '{"username": "other"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'nameless-rename@test.dev', '{}');

insert into public.posted_prompts (
  slug, author_id, author_handle, file_name, title, tagline, summary, category,
  meant_for, highlights, usage_steps, works_with, content, preview_line_count
) values (
  'rename-post', '00000000-0000-0000-0000-0000000000a1', '@renamer', 'test.md', 'Test prompt',
  'A tagline long enough', 'A summary that is long enough.', 'code-conventions', '{Web apps}', '{One highlight}',
  '{Drop it in}', '{Cursor}', E'line 1\nline 2\nline 3\n', 5
);

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant execute on function pg_temp.act_as(uuid) to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

select throws_ok($$ select public.change_username('no spaces') $$, 'MD422', null, 'an invalid username is refused');
select throws_ok($$ select public.change_username('@OTHER') $$, 'MD409', null, 'a taken username is refused, ignoring case');
select is(public.change_username('renamer'), 'renamer', 'saving the current username is a no-op');
select is(public.change_username('@new-name'), 'new-name', 'a free username is saved without its @');

reset role;
select is(
  (select username from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'new-name',
  'the profile has the new username'
);
select is(
  (select author_handle from public.posted_prompts where slug = 'rename-post'),
  '@new-name',
  'the owner''s posts carry the new handle'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.change_username('third-name') $$, 'MD429', null, 'a second change within 30 days is refused');

reset role;
update public.profiles set username_changed_at = now() - interval '31 days'
  where user_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(public.change_username('renamer'), 'renamer', 'after 30 days the old name can be taken back');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok($$ select public.change_username('picked') $$, 'MD428', null, 'an account without a username picks one instead');

-- No update policy: a direct update matches no row, so only change_username() can rename.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
update public.profiles set username = 'direct' where user_id = '00000000-0000-0000-0000-0000000000a2';
reset role;
select is(
  (select username from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a2'),
  'other',
  'a direct update of profiles changes nothing'
);

select * from finish();
rollback;
