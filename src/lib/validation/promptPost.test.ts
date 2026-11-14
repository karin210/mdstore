import { describe, expect, it } from "vitest";
import { prompt_kinds } from "@/data/prompts";
import { check_kind, promptPostSchema } from "@/lib/validation/promptPost";

describe("check_kind", () => {
  it.each(prompt_kinds)("accepts %s", (kind) => {
    expect(check_kind(kind)).toBeNull();
  });

  it.each(["", "skill", "Instructions", " agent"])("asks to choose a kind for %j", (value) => {
    expect(check_kind(value)).toEqual({ key: "chooseKind" });
  });
});

describe("promptPostSchema kind", () => {
  const valid_submission = {
    title: "Form UX",
    tagline: "Makes every form easier to fill in.",
    summary: "Rules for labels, inline guidance and focus on submit.",
    category: "frontend",
    kind: "instructions",
    authorHandle: "karin",
    meantFor: "React apps",
    highlights: "Inline guidance",
    usageSteps: "Drop it into your repo",
    worksWith: ["Claude Code"],
    file: new File(["# Form UX\n"], "form-ux.md"),
    previewLineCount: "12",
  };

  it("accepts a known kind", () => {
    expect(promptPostSchema.safeParse(valid_submission).success).toBe(true);
  });

  it("rejects a missing or unknown kind with the chooseKind message", () => {
    for (const kind of ["", "skill"]) {
      const result = promptPostSchema.safeParse({ ...valid_submission, kind });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([["kind", "chooseKind"]]);
    }
  });
});
