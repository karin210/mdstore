import { describe, expect, it } from "vitest";
import type { PromptPostValues } from "@/lib/forms/PromptPostForm";
import { build_preview_listing, type PostPreviewSnapshot } from "@/lib/postPreview";

const EMPTY_VALUES: PromptPostValues = {
  kind: "prompt",
  title: "",
  tagline: "",
  summary: "",
  category: "",
  meantFor: "",
  highlights: "",
  usageSteps: "",
  worksWith: [],
  testedModels: [],
  file: null,
  previewLineCount: "12",
  outputExamples: [],
};

function snapshot_of(values: Partial<PromptPostValues>, extra: Partial<PostPreviewSnapshot> = {}): PostPreviewSnapshot {
  return {
    values: { ...EMPTY_VALUES, ...values },
    byline: "@ana",
    post_slug: null,
    current_file: null,
    ...extra,
  };
}

describe("build_preview_listing", () => {
  it("leaves every empty field blank and marks it", () => {
    const { prompt, category, empty_fields } = build_preview_listing({
      snapshot: snapshot_of({}),
      file: null,
      image_urls: new Map(),
    });

    expect(prompt.title).toBe("");
    expect(prompt.highlights).toEqual([]);
    expect(prompt.fileName).toBe("");
    expect(prompt.excerpt).toBe("");
    expect(prompt.lineCount).toBe(0);
    expect(prompt.fullMarkdown).toBeNull();
    expect(category).toBeNull();
    expect([...empty_fields].toSorted()).toEqual(
      ["category", "file", "highlights", "meantFor", "summary", "tagline", "title", "usageSteps"].toSorted(),
    );
  });

  it("builds the listing the way the server stores a post", () => {
    const text = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");
    const { prompt, category, empty_fields } = build_preview_listing({
      snapshot: snapshot_of({
        title: "  Form UX review ",
        category: "frontend",
        highlights: "First\n\n  Second  \n",
        previewLineCount: "5",
      }),
      file: { name: "My Form Rules.md", text },
      image_urls: new Map(),
    });

    expect(prompt.title).toBe("Form UX review");
    expect(prompt.slug).toBe("form-ux-review");
    expect(prompt.fileName).toBe("my-form-rules.md");
    expect(prompt.highlights).toEqual(["First", "Second"]);
    expect(prompt.excerpt).toBe("line 1\nline 2\nline 3\nline 4\nline 5");
    expect(prompt.lineCount).toBe(20);
    expect(prompt.fullMarkdown).toBe(text);
    expect(prompt.priceUsd).toBe(0);
    expect(prompt.author).toBe("@ana");
    expect(category).toBe("frontend");
    expect(empty_fields.has("title")).toBe(false);
    expect(empty_fields.has("file")).toBe(false);
  });

  it("keeps a new version's slug and falls back to the default preview length when it is invalid", () => {
    const text = Array.from({ length: 30 }, (_, index) => `l${index}`).join("\n");
    const { prompt } = build_preview_listing({
      snapshot: snapshot_of({ title: "Renamed", previewLineCount: "abc" }, { post_slug: "original-slug" }),
      file: { name: "original-slug.md", text },
      image_urls: new Map(),
    });

    expect(prompt.slug).toBe("original-slug");
    expect(prompt.excerpt.split("\n")).toHaveLength(12);
  });

  it("lists only the examples that have a browser URL, and only known models", () => {
    const { prompt } = build_preview_listing({
      snapshot: snapshot_of({
        title: "Title",
        outputExamples: [
          { id: "a", caption: "", path: null, file: null },
          { id: "b", caption: "The form", path: null, file: null },
        ],
        testedModels: [{ model_id: "not-a-model", recommended: true }],
      }),
      file: null,
      image_urls: new Map([["b", "blob:http://localhost/b"]]),
    });

    expect(prompt.outputExamples).toEqual([{ src: "blob:http://localhost/b", alt: "The form", caption: "The form" }]);
    expect(prompt.tested_models).toEqual([]);
  });
});
