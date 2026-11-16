import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { get_base_url, production_url } from "./config.js";

describe("get_base_url", () => {
  it("defaults to the production site", () => {
    expect(get_base_url({})).toBe(production_url);
  });

  it("uses MDSTORE_API_URL without a trailing slash", () => {
    expect(get_base_url({ MDSTORE_API_URL: "http://localhost:3000/" })).toBe("http://localhost:3000");
  });

  it.each(["not a url", "ftp://example.com"])("rejects %j", (value) => {
    expect(() => get_base_url({ MDSTORE_API_URL: value })).toThrow(/MDSTORE_API_URL/);
  });

  it("matches siteConfig.url in the site's src/lib/site.ts", () => {
    const site = readFileSync(fileURLToPath(new URL("../../../src/lib/site.ts", import.meta.url)), "utf8");
    expect(/url: "([^"]+)"/.exec(site)?.[1]).toBe(production_url);
  });
});
