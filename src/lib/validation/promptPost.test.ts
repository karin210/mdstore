import { describe, expect, it } from "vitest";
import { install_kinds } from "@/data/prompts";
import { check_install_kind, promptPostSchema } from "@/lib/validation/promptPost";

describe("check_install_kind", () => {
  it.each(install_kinds)("accepts %s", (install_kind) => {
    expect(check_install_kind(install_kind)).toBeNull();
  });

  it.each(["", "skill", "Instructions", " agent"])("asks to choose an install kind for %j", (value) => {
    expect(check_install_kind(value)).toEqual({ key: "chooseInstallKind" });
  });
});

describe("promptPostSchema install_kind", () => {
  const valid_submission = {
    title: "Form UX",
    tagline: "Makes every form easier to fill in.",
    summary: "Rules for labels, inline guidance and focus on submit.",
    category: "frontend",
    kind: "prompt",
    install_kind: "instructions",
    meantFor: "React apps",
    highlights: "Inline guidance",
    usageSteps: "Drop it into your repo",
    worksWith: ["Claude Code"],
    file: new File(["# Form UX\n"], "form-ux.md"),
    previewLineCount: "12",
  };

  it("accepts a known install kind", () => {
    expect(promptPostSchema.safeParse(valid_submission).success).toBe(true);
  });

  it("rejects a missing or unknown install kind with the chooseInstallKind message", () => {
    for (const install_kind of ["", "skill"]) {
      const result = promptPostSchema.safeParse({ ...valid_submission, install_kind });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
        ["install_kind", "chooseInstallKind"],
      ]);
    }
  });
});
