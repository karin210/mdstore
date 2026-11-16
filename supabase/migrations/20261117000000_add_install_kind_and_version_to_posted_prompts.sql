-- Where the mdstore CLI installs a posted prompt, and its version.
-- `install_kind` decides where the CLI puts the file; keep the list in step with install_kinds in
-- src/data/prompts.ts. (Not the same as `kind`, which says whether a listing is a prompt or a
-- skill.) `version` starts at 1 and goes up by one each time the file changes; the CLI compares it
-- with its lockfile to find updates. Existing rows get the defaults.

alter table public.posted_prompts
  add column install_kind text not null default 'instructions'
    check (install_kind in ('instructions', 'command', 'agent')),
  add column version integer not null default 1
    check (version >= 1);
