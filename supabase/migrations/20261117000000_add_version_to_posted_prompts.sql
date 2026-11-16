-- The version of a posted prompt, for the mdstore CLI.
-- `version` starts at 1 and goes up by one each time the file changes; the CLI compares it with its
-- lockfile to find updates. Existing rows get 1.

alter table public.posted_prompts
  add column version integer not null default 1
    check (version >= 1);
