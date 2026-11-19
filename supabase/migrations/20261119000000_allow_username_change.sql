-- Users can change their @username from /profile, at most once every 30 days.
--
-- profiles still has no update policy: the rename goes through change_username(), which checks
-- the caller, the format, the cool-down and the name, and keeps every copy of the handle in step
-- in one transaction. posted_prompts.author_handle is that copy: the public API and the bylines of
-- posts without an author list read it, so it is rewritten for every post the caller owns.
-- Old usernames are not reserved: once changed, anyone may take the old one.

alter table public.profiles add column username_changed_at timestamptz;

-- Errors (same convention as the review functions):
--   MD401 not signed in   MD422 invalid username   MD409 taken   MD429 changed less than 30 days ago
--   MD428 the caller has no username yet (they pick one with an insert instead)
-- Returns the saved username. Saving the current one again is a no-op that doesn't start the cool-down.
create function public.change_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_profile();
  v_username text := ltrim(btrim(p_username), '@');
  v_profile public.profiles;
begin
  if v_username !~ '^[A-Za-z0-9._-]{2,39}$' then
    raise exception 'Invalid username' using errcode = 'MD422';
  end if;

  select * into v_profile from public.profiles where user_id = v_user for update;
  if v_profile.username = v_username then
    return v_username;
  end if;
  if v_profile.username_changed_at > now() - interval '30 days' then
    raise exception 'Username changed less than 30 days ago' using errcode = 'MD429';
  end if;
  -- A change of case only (Owner → owner) is the caller's own name, so it isn't "taken".
  if exists (select 1 from public.profiles where lower(username) = lower(v_username) and user_id <> v_user) then
    raise exception 'Username taken' using errcode = 'MD409';
  end if;

  -- A concurrent rename to the same name still fails on profiles_username_key (23505).
  update public.profiles set username = v_username, username_changed_at = now() where user_id = v_user;
  update public.posted_prompts set author_handle = '@' || v_username where author_id = v_user;
  return v_username;
end;
$$;

revoke execute on function public.change_username(text) from public, anon;
grant execute on function public.change_username(text) to authenticated;
