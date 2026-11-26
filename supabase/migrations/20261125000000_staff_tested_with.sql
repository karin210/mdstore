-- What a prompt was tested with (`works_with`: the AI coding tools; `tested_models` / `recommended_models`: the
-- specific models) is now the staff's to say, not the author's: the upload form no longer asks for it, a new
-- post starts with none, and a new revision keeps whatever the post had (see src/server/reviews/actions.ts).
-- How the staff will record it is not built yet.
--
-- So `works_with` may now be empty. Until now it needed 1 to 8 tools, on the post and on each revision; the
-- upper bound stays. The model columns were already optional (20261123000000_add_tested_models.sql).

alter table public.posted_prompts drop constraint posted_prompts_works_with_check;
alter table public.posted_prompts
  add constraint posted_prompts_works_with_check check (cardinality(works_with) <= 8);

alter table public.prompt_revisions drop constraint prompt_revisions_works_with_check;
alter table public.prompt_revisions
  add constraint prompt_revisions_works_with_check check (cardinality(works_with) <= 8);
