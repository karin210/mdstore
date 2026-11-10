-- Prompts posted by signed-in users from /upload, shown at /prompts/[slug].
-- The checks mirror src/lib/validation/promptPost.ts, so the rules hold even for requests that
-- skip the app (anyone holding the publishable key can call the API directly).

create table public.posted_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_handle text not null check (author_handle ~ '^@[A-Za-z0-9._-]{2,39}$'),
  file_name text not null check (file_name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.md$' and char_length(file_name) <= 64),
  title text not null check (char_length(title) between 3 and 80),
  tagline text not null check (char_length(tagline) between 10 and 140),
  summary text not null check (char_length(summary) between 20 and 400),
  category text not null
    check (category in ('conventions', 'agents', 'frontend', 'testing', 'refactoring', 'devops')),
  meant_for text[] not null check (cardinality(meant_for) between 1 and 6),
  highlights text[] not null check (cardinality(highlights) between 1 and 10),
  usage_steps text[] not null check (cardinality(usage_steps) between 1 and 8),
  works_with text[] not null check (cardinality(works_with) between 1 and 8),
  content text not null check (char_length(content) between 1 and 204800),
  preview_line_count integer not null check (preview_line_count between 5 and 40),
  created_at timestamptz not null default now()
);

create index posted_prompts_author_id_idx on public.posted_prompts (author_id);

alter table public.posted_prompts enable row level security;

-- Posted prompts are free and public: anyone can read them.
create policy "Posted prompts are readable by everyone"
  on public.posted_prompts for select
  to anon, authenticated
  using (true);

-- Only signed-in users can post, and only as themselves.
create policy "Signed-in users post their own prompts"
  on public.posted_prompts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

-- No update or delete policies yet: with RLS on, both are denied by default.
