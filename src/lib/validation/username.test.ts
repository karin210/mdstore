import { describe, expect, it } from "vitest";
import { get_username_guidance, normalize_username, username_schema } from "@/lib/validation/username";

describe("get_username_guidance", () => {
  it("accepts letters, digits, dots, dashes and underscores", () => {
    expect(get_username_guidance("ana.dev_2-x")).toBeNull();
  });

  it("accepts a leading @", () => {
    expect(get_username_guidance("@ana")).toBeNull();
  });

  it("asks for a value when empty or only an @", () => {
    expect(get_username_guidance("  ")).toBe("usernameRequired");
    expect(get_username_guidance("@")).toBe("usernameRequired");
  });

  it("rejects spaces, other characters and lengths outside 2 to 39", () => {
    expect(get_username_guidance("ana maria")).toBe("usernameFormat");
    expect(get_username_guidance("ana!")).toBe("usernameFormat");
    expect(get_username_guidance("a")).toBe("usernameFormat");
    expect(get_username_guidance("a".repeat(40))).toBe("usernameFormat");
  });
});

describe("username_schema", () => {
  it("stores the name without @ or spaces", () => {
    expect(username_schema.parse(" @Ana ")).toBe("Ana");
    expect(normalize_username("@@ana")).toBe("@ana");
  });
});
