import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { prompt_kinds } from "./kinds.js";

/** Reads a string array literal (`name = [ "a", "b" ]`) from a source file of the mdstore repo. */
function read_list(repo_file: string, pattern: RegExp): string[] {
  const text = readFileSync(fileURLToPath(new URL(`../../../${repo_file}`, import.meta.url)), "utf8");
  const match = pattern.exec(text);
  if (!match?.[1]) throw new Error(`No list found in ${repo_file}`);
  return [...match[1].matchAll(/["']([a-z]+)["']/g)].map((item) => item[1]!);
}

// The CLI is published on its own, so it keeps a copy of the list; these checks keep it in step.
describe("prompt_kinds", () => {
  it("matches the site's list in src/data/prompts.ts", () => {
    expect(read_list("src/data/prompts.ts", /prompt_kinds = \[([^\]]*)\]/)).toEqual([...prompt_kinds]);
  });

  it("matches the posted_prompts kind check", () => {
    const migration = "supabase/migrations/20261114000000_add_kind_and_version_to_posted_prompts.sql";
    expect(read_list(migration, /kind in \(([^)]*)\)/)).toEqual([...prompt_kinds]);
  });
});
