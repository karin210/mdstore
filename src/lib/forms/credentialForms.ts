import { BaseForm } from "@/lib/forms/BaseForm";
import {
  getEmailGuidance,
  getSignInPasswordGuidance,
  getSignUpPasswordGuidance,
  type CredentialField,
  type GuidanceKey,
  type SignUpField,
} from "@/lib/validation/credentials";
import { get_username_guidance, type UsernameGuidanceKey } from "@/lib/validation/username";

export type CredentialValues = Record<CredentialField, string>;
export type SignUpValues = Record<SignUpField, string>;

const CREDENTIAL_FIELDS: readonly CredentialField[] = ["email", "password"];
const EMPTY_CREDENTIALS: CredentialValues = { email: "", password: "" };
const SIGN_UP_FIELDS: readonly SignUpField[] = ["email", "username", "password"];
const EMPTY_SIGN_UP: SignUpValues = { email: "", username: "", password: "" };

/** Sign-in: a well-formed email and any typed password (older accounts may predate the rules). */
export class SignInForm extends BaseForm<CredentialField, CredentialValues, GuidanceKey> {
  constructor() {
    super(EMPTY_CREDENTIALS, CREDENTIAL_FIELDS);
  }

  protected getFieldIssue(field: CredentialField): GuidanceKey | null {
    const value = this.values[field];
    return field === "email" ? getEmailGuidance(value) : getSignInPasswordGuidance(value);
  }
}

/** Sign-up: a well-formed email, a valid @username and a password meeting the shared sign-up rules. */
export class SignUpForm extends BaseForm<SignUpField, SignUpValues, GuidanceKey | UsernameGuidanceKey> {
  constructor() {
    super(EMPTY_SIGN_UP, SIGN_UP_FIELDS);
  }

  protected getFieldIssue(field: SignUpField): GuidanceKey | UsernameGuidanceKey | null {
    const value = this.values[field];
    if (field === "email") return getEmailGuidance(value);
    if (field === "username") return get_username_guidance(value);
    return getSignUpPasswordGuidance(value);
  }
}

/** The "pick your username" form, for accounts created before usernames existed. */
export class UsernameForm extends BaseForm<"username", { username: string }, UsernameGuidanceKey> {
  constructor() {
    super({ username: "" }, ["username"]);
  }

  protected getFieldIssue(): UsernameGuidanceKey | null {
    return get_username_guidance(this.values.username);
  }
}
