-- What kind of file a posted prompt is, and its version, for the mdstore CLI.
-- `kind` decides where the CLI installs the file; keep the list in step with prompt_kinds in
-- src/data/prompts.ts. `version` starts at 1 and goes up by one each time the file changes; the
-- CLI compares it with its lockfile to find updates. Existing rows get the defaults.

alter table public.posted_prompts
  add column kind text not null default 'instructions'
    check (kind in ('instructions', 'command', 'agent')),
  add column version integer not null default 1
    check (version >= 1);
