import { describe, expect, it } from "vitest";
import { prompt_kinds } from "@/data/prompts";
import { check_output_examples, check_tested_models, checkKind, promptPostSchema } from "@/lib/validation/promptPost";

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
    testedModels: [],
    file: new File(["# Form UX\n"], "form-ux.md"),
    previewLineCount: "12",
    outputExamples: [],
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

describe("check_tested_models", () => {
  it("accepts no models, or registry models with or without a recommendation", () => {
    expect(check_tested_models([])).toBeNull();
    expect(
      check_tested_models([
        { model_id: "claude-opus-5-5", recommended: true },
        { model_id: "gpt-5-1", recommended: false },
      ]),
    ).toBeNull();
  });

  it("refuses an unknown or repeated model", () => {
    expect(check_tested_models([{ model_id: "gpt-9", recommended: false }])).toEqual({ key: "unknownModel" });
    expect(
      check_tested_models([
        { model_id: "gpt-5-1", recommended: false },
        { model_id: "gpt-5-1", recommended: true },
      ]),
    ).toEqual({ key: "unknownModel" });
  });
});

describe("check_output_examples", () => {
  const png = { type: "image/png", size: 1024 };
  const stored = (path = "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png") => ({
    caption: "",
    path,
    file: null,
  });

  it("accepts no examples, picked images and stored ones together", () => {
    expect(check_output_examples([])).toBeNull();
    expect(check_output_examples([{ caption: "A form", path: null, file: png }, stored()])).toBeNull();
  });

  it("refuses more than six, other file types, big files and long captions", () => {
    expect(check_output_examples(Array.from({ length: 7 }, () => stored()))).toEqual({
      key: "tooManyImages",
      values: { max: 6 },
    });
    expect(check_output_examples([{ caption: "", path: null, file: { type: "image/gif", size: 10 } }])).toEqual({
      key: "imageType",
    });
    expect(check_output_examples([{ caption: "", path: null, file: { type: "image/png", size: 0 } }])).toEqual({
      key: "imageType",
    });
    expect(
      check_output_examples([{ caption: "", path: null, file: { type: "image/png", size: 2 * 1024 * 1024 + 1 } }]),
    ).toEqual({ key: "imageTooLarge" });
    expect(check_output_examples([{ caption: "x".repeat(121), path: null, file: png }])).toEqual({
      key: "tooLong",
      values: { max: 120 },
    });
  });
});
