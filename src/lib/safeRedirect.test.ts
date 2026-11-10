import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, getSafeRedirectPath } from "@/lib/safeRedirect";

describe("getSafeRedirectPath", () => {
  it.each(["/upload", "/es/upload", "/prompts/global?tab=preview"])("keeps the same-site path %s", (pathValue) => {
    expect(getSafeRedirectPath(pathValue)).toBe(pathValue);
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/redirect?to=https://evil.example",
    "upload",
    "/up load",
    "",
    undefined,
    ["/upload"],
  ])("falls back for %j", (pathValue) => {
    expect(getSafeRedirectPath(pathValue)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
