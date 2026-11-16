import { describe, expect, it } from "vitest";
import {
  generateSuggestedPassword,
  getEmailGuidance,
  getEmailParts,
  getSignInPasswordGuidance,
  getSignUpPasswordGuidance,
  getSignUpPasswordRules,
  isEmailValid,
  isSignUpPasswordValid,
  signUpSchema,
} from "@/lib/validation/credentials";

describe("email", () => {
  it.each(["name@domain.com", "  first.last+tag@sub.domain.io  "])("accepts %s", (emailValue) => {
    expect(isEmailValid(emailValue)).toBe(true);
  });

  it.each(["name", "name@", "name@domain", "name@domain.c", "a@b@c.com", "na me@domain.com", "@domain.com"])(
    "rejects %s",
    (emailValue) => {
      expect(isEmailValid(emailValue)).toBe(false);
    },
  );

  it("meets every helper chunk exactly when the email is valid", () => {
    for (const emailValue of ["", "name", "name@", "name@domain", "name@domain.", "name@domain.com"]) {
      const isEveryChunkMet = getEmailParts(emailValue).every((part) => part.isMet);
      expect(isEveryChunkMet).toBe(isEmailValid(emailValue));
    }
  });

  it("asks for the email first, then for the format", () => {
    expect(getEmailGuidance("   ")).toBe("emailRequired");
    expect(getEmailGuidance("name@")).toBe("emailFormat");
    expect(getEmailGuidance("name@domain.com")).toBeNull();
  });
});

describe("sign-up password", () => {
  it.each([
    ["Chrome", "aB3dEf9hJk2mNp4"],
    ["Chrome with symbols", "Xy7:pq_Lm-90zz"],
    ["Safari", "abcDEF-123ghi-JKL456"],
  ])("accepts a %s suggestion", (_source, passwordValue) => {
    expect(isSignUpPasswordValid(passwordValue)).toBe(true);
  });

  it("never requires a symbol", () => {
    expect(isSignUpPasswordValid("Abcdefg1")).toBe(true);
  });

  it("rejects short, single-case, digitless, spaced or over-long passwords", () => {
    expect(getSignUpPasswordGuidance("")).toBe("passwordRequired");
    expect(getSignUpPasswordGuidance("Abcde1")).toBe("passwordRules");
    expect(getSignUpPasswordGuidance("abcdefg1")).toBe("passwordRules");
    expect(getSignUpPasswordGuidance("Abcdefgh")).toBe("passwordRules");
    expect(getSignUpPasswordGuidance("Abcd efg1")).toBe("passwordSpaces");
    expect(getSignUpPasswordGuidance(`Ab1${"x".repeat(70)}`)).toBe("passwordTooLong");
  });

  it("meets every helper chunk exactly when the password is valid", () => {
    for (const passwordValue of ["", "abc", "Abcdefg1", "Abcd efg1", "abcdefg1", `Ab1${"x".repeat(70)}`]) {
      const isEveryRuleMet = getSignUpPasswordRules(passwordValue).every((rule) => rule.isMet);
      expect(isEveryRuleMet).toBe(isSignUpPasswordValid(passwordValue));
    }
  });

  it("suggests passwords that pass its own rule", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(isSignUpPasswordValid(generateSuggestedPassword())).toBe(true);
    }
  });
});

describe("sign-in password", () => {
  it("only checks that a password was typed", () => {
    expect(getSignInPasswordGuidance("")).toBe("passwordRequired");
    expect(getSignInPasswordGuidance("short")).toBeNull();
  });
});

describe("signUpSchema", () => {
  it("normalizes the email and the username and rejects unknown fields", () => {
    const parsedResult = signUpSchema.safeParse({
      email: " Name@Domain.COM ",
      username: " @Ana ",
      password: "Abcdefg1",
    });
    expect(parsedResult.success && parsedResult.data.email).toBe("name@domain.com");
    expect(parsedResult.success && parsedResult.data.username).toBe("Ana");
    expect(
      signUpSchema.safeParse({ email: "name@domain.com", username: "ana", password: "Abcdefg1", role: "admin" })
        .success,
    ).toBe(false);
  });

  it("requires a valid username", () => {
    const parsedResult = signUpSchema.safeParse({ email: "name@domain.com", username: "a b", password: "Abcdefg1" });
    expect(parsedResult.success).toBe(false);
    expect(parsedResult.error?.issues[0].message).toBe("usernameFormat");
  });
});
