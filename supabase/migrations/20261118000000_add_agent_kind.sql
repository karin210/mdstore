-- A listing can also be an agent (a subagent definition), besides a prompt or a skill.
-- The kind decides how a developer gets the file; keep the list in step with prompt_kinds in
-- src/data/prompts.ts and in packages/cli/src/kinds.ts. The checks were created inline, so they carry
-- the default names.

alter table public.posted_prompts
  drop constraint posted_prompts_kind_check,
  add constraint posted_prompts_kind_check check (kind in ('prompt', 'skill', 'agent'));

alter table public.prompt_revisions
  drop constraint prompt_revisions_kind_check,
  add constraint prompt_revisions_kind_check check (kind in ('prompt', 'skill', 'agent'));
