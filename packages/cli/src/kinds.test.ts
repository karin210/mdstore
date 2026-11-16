import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kinds } from "./kinds.js";

/** Reads a string array literal (`name = [ "a", "b" ]`) from a source file of the mdstore repo. */
function read_list(repo_file: string, pattern: RegExp): string[] {
  const text = readFileSync(fileURLToPath(new URL(`../../../${repo_file}`, import.meta.url)), "utf8");
  const match = pattern.exec(text);
  if (!match?.[1]) throw new Error(`No list found in ${repo_file}`);
  return [...match[1].matchAll(/["']([a-z]+)["']/g)].map((item) => item[1]!);
}

// The CLI is published on its own, so it keeps a copy of the list; these checks keep it in step.
describe("kinds", () => {
  it("matches the site's list in src/data/prompts.ts", () => {
    expect(read_list("src/data/prompts.ts", /prompt_kinds = \[([^\]]*)\]/)).toEqual([...kinds]);
  });

  it.each(["posted_prompts", "prompt_revisions"])("matches the %s kind check", (table) => {
    const migration = "supabase/migrations/20261118000000_add_agent_kind.sql";
    const check = new RegExp(`${table}_kind_check check \\(kind in \\(([^)]*)\\)\\)`);
    expect(read_list(migration, check)).toEqual([...kinds]);
  });
});
