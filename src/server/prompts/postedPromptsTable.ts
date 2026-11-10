/** Table of prompts posted by users (see supabase/migrations). Public read, owner-only insert. */
export const POSTED_PROMPTS_TABLE = "posted_prompts";

/** Same shape as the database's slug check, so malformed URLs never reach a query. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
