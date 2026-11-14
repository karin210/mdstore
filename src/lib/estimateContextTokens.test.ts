import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { featuredPrompts } from "@/data/prompts";
import { estimate_context_tokens } from "@/lib/estimateContextTokens";

describe("estimate_context_tokens", () => {
  it("counts about four characters per token, rounded to the nearest 50", () => {
    expect(estimate_context_tokens("a".repeat(4000))).toBe(1000);
    expect(estimate_context_tokens("a".repeat(4090))).toBe(1000);
    expect(estimate_context_tokens("a".repeat(4110))).toBe(1050);
  });

  it("never goes below one rounding step, even for an empty file", () => {
    expect(estimate_context_tokens("")).toBe(50);
  });
});

describe("catalogue context_tokens", () => {
  it.each(featuredPrompts.map((prompt) => [prompt.slug, prompt] as const))(
    "%s is within 15% of its file's estimate",
    (_slug, prompt) => {
      const text = readFileSync(path.join(process.cwd(), "content", "prompts", prompt.fileName), "utf8");
      const estimate = estimate_context_tokens(text);

      // Keep context_tokens in src/data/prompts.ts in sync with the file when it changes a lot.
      expect(Math.abs(prompt.context_tokens - estimate)).toBeLessThanOrEqual(estimate * 0.15);
    },
  );
});
