import { describe, expect, it } from "vitest";
import { is_model_id, to_tested_models } from "@/data/aiModels";

describe("to_tested_models", () => {
  it("keeps the registry's order and flags the recommended models", () => {
    expect(to_tested_models(["gpt-5-1", "claude-opus-5-5"], ["gpt-5-1"])).toEqual([
      { model_id: "claude-opus-5-5", recommended: false },
      { model_id: "gpt-5-1", recommended: true },
    ]);
  });

  it("leaves out ids the registry doesn't know", () => {
    expect(to_tested_models(["retired-model", "gemini-3-pro"], ["retired-model"])).toEqual([
      { model_id: "gemini-3-pro", recommended: false },
    ]);
  });
});

describe("is_model_id", () => {
  it("knows registry keys only", () => {
    expect(is_model_id("claude-haiku-5-5")).toBe(true);
    expect(is_model_id("toString")).toBe(false);
    expect(is_model_id("Claude Haiku 5.5")).toBe(false);
  });
});
