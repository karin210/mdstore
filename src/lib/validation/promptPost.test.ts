import { describe, expect, it } from "vitest";
import { prompt_kinds } from "@/data/prompts";
import {
  check_coauthors,
  check_output_examples,
  checkKind,
  MAX_COAUTHORS,
  promptPostSchema,
} from "@/lib/validation/promptPost";

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
    category: "ux-ui",
    meantFor: "React apps",
    highlights: "Inline guidance",
    usageSteps: "Drop it into your repo",
    file: new File(["# Form UX\n"], "form-ux.md"),
    outputExamples: [
      { path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png", caption: "" },
    ],
    coauthors: [],
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

  it("refuses tools or models from the author: the staff provide them", () => {
    expect(promptPostSchema.safeParse({ ...valid_submission, worksWith: ["Claude Code"] }).success).toBe(false);
    expect(promptPostSchema.safeParse({ ...valid_submission, testedModels: [] }).success).toBe(false);
  });
});

describe("check_output_examples", () => {
  const png = { type: "image/png", size: 1024 };
  const stored = (path = "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png") => ({
    caption: "",
    path,
    file: null,
  });

  it("asks for at least one example", () => {
    expect(check_output_examples([])).toEqual({ key: "imagesRequired" });
  });

  it("accepts picked images and stored ones together", () => {
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

describe("check_coauthors", () => {
  it("accepts none, or distinct well-formed usernames", () => {
    expect(check_coauthors([])).toBeNull();
    expect(check_coauthors(["ana", "@luis.dev"])).toBeNull();
  });

  it("refuses the same user twice, ignoring case and the @", () => {
    expect(check_coauthors(["ana", "@Ana"])).toEqual({ key: "coauthorInvalid" });
  });

  it("refuses malformed usernames", () => {
    expect(check_coauthors(["a"])).toEqual({ key: "coauthorInvalid" });
    expect(check_coauthors(["ana%"])).toEqual({ key: "coauthorInvalid" });
  });

  it("refuses more than the maximum", () => {
    const usernames = Array.from({ length: MAX_COAUTHORS + 1 }, (_, index) => `user${index}`);
    expect(check_coauthors(usernames)).toEqual({ key: "tooManyItems", values: { max: MAX_COAUTHORS } });
  });
});
