import { describe, expect, it } from "vitest";
import {
  change_email_schema,
  change_password_schema,
  get_new_password_guidance,
  get_next_username_change,
} from "@/lib/validation/accountChanges";

describe("get_next_username_change", () => {
  const now = new Date("2026-11-19T12:00:00Z");

  it("allows a change when the username never changed", () => {
    expect(get_next_username_change(null, now)).toBeNull();
  });

  it("waits 30 days after the last change", () => {
    expect(get_next_username_change("2026-11-01T12:00:00Z", now)?.toISOString()).toBe("2026-12-01T12:00:00.000Z");
  });

  it("allows a change once the 30 days have passed", () => {
    expect(get_next_username_change("2026-10-19T11:00:00Z", now)).toBeNull();
  });
});

describe("new password", () => {
  it("follows the sign-up rules", () => {
    expect(get_new_password_guidance("short", "Current1pass")).toBe("passwordRules");
  });

  it("must differ from the current one", () => {
    expect(get_new_password_guidance("Same1password", "Same1password")).toBe("passwordUnchanged");
  });

  it("accepts a valid, different password", () => {
    expect(get_new_password_guidance("Brand1newpass", "Old1password")).toBeNull();
  });
});

describe("server schemas", () => {
  it("normalizes the new email", () => {
    expect(change_email_schema.parse({ email: "  Name@Domain.com " })).toEqual({ email: "name@domain.com" });
  });

  it("reports the new-password problem on its own field", () => {
    const result = change_password_schema.safeParse({ current_password: "old", new_password: "old" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ["new_password", "passwordRules"],
    ]);
  });

  it("accepts an old-style current password", () => {
    expect(change_password_schema.safeParse({ current_password: "old", new_password: "Brand1newpass" }).success).toBe(
      true,
    );
  });
});
