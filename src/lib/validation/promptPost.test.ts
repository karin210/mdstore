import { describe, expect, it } from "vitest";
import { prompt_kinds } from "@/data/prompts";
import { checkKind, promptPostSchema } from "@/lib/validation/promptPost";

describe("checkKind", () => {
  it.each(prompt_kinds)("accepts %s", (kind) => {
    expect(checkKind(kind)).toBeNull();
  });

  it.each(["", "instructions", "Skill", " agent"])("asks to choose a kind for %j", (value) => {
    expect(checkKind(value)).toEqual({ key: "chooseKind" });
  });
});

describe("promptPostSchema kind", () => {
  const valid_submission = {
    kind: "prompt",
    title: "Form UX",
    tagline: "Makes every form easier to fill in.",
    summary: "Rules for labels, inline guidance and focus on submit.",
    category: "frontend",
    meantFor: "React apps",
    highlights: "Inline guidance",
    usageSteps: "Drop it into your repo",
    worksWith: ["Claude Code"],
    file: new File(["# Form UX\n"], "form-ux.md"),
    previewLineCount: "12",
  };

  it.each(prompt_kinds)("accepts the %s kind", (kind) => {
    expect(promptPostSchema.safeParse({ ...valid_submission, kind }).success).toBe(true);
  });

  it("rejects a missing or unknown kind with the chooseKind message", () => {
    for (const kind of ["", "instructions"]) {
      const result = promptPostSchema.safeParse({ ...valid_submission, kind });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([["kind", "chooseKind"]]);
    }
  });
});
