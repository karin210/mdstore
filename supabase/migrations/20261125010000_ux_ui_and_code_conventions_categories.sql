-- Three categories instead of six: `ux-ui` (interface design, styling, accessibility and UX), `frontend` (building
-- the client side: components, state, routing, data fetching, browser APIs) and `code-conventions` (how code is
-- written, structured, named, documented and secured). The old six didn't describe the listings being posted:
-- `agents` repeated the `agent` kind, and `conventions` would have held nearly everything.
--
-- Existing rows move over: `frontend` stays; `conventions`, `refactoring`, `agents`, `testing` and `devops` become
-- `code-conventions`. Revisions move too, so a review's history and its "changes" view stay valid under the new
-- check. The list must match `promptCategories` in src/data/prompts.ts.

alter table public.posted_prompts drop constraint posted_prompts_category_check;
alter table public.prompt_revisions drop constraint prompt_revisions_category_check;

update public.posted_prompts set category = 'code-conventions' where category <> 'frontend';
update public.prompt_revisions set category = 'code-conventions' where category <> 'frontend';

alter table public.posted_prompts
  add constraint posted_prompts_category_check check (category in ('ux-ui', 'frontend', 'code-conventions'));
alter table public.prompt_revisions
  add constraint prompt_revisions_category_check check (category in ('ux-ui', 'frontend', 'code-conventions'));
