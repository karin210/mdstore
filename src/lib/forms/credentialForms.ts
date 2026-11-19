import { BaseForm } from "@/lib/forms/BaseForm";
import {
  get_new_password_guidance,
  type ChangePasswordField,
  type NewPasswordGuidanceKey,
} from "@/lib/validation/accountChanges";
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

/**
 * A single @username: the "pick your username" form (accounts created before usernames existed)
 * starts empty, the profile's "change username" form starts with the current one.
 */
export class UsernameForm extends BaseForm<"username", { username: string }, UsernameGuidanceKey> {
  constructor(initial_username = "") {
    super({ username: initial_username }, ["username"]);
  }

  protected getFieldIssue(): UsernameGuidanceKey | null {
    return get_username_guidance(this.values.username);
  }
}

/** The profile's "change email" form: one well-formed email. */
export class EmailChangeForm extends BaseForm<"email", { email: string }, GuidanceKey> {
  constructor() {
    super({ email: "" }, ["email"]);
  }

  protected getFieldIssue(): GuidanceKey | null {
    return getEmailGuidance(this.values.email);
  }
}

export type PasswordChangeValues = Record<ChangePasswordField, string>;

/** The profile's "change password" form: the current password, then a new one that follows the rules. */
export class PasswordChangeForm extends BaseForm<ChangePasswordField, PasswordChangeValues, NewPasswordGuidanceKey> {
  constructor() {
    super({ current_password: "", new_password: "" }, ["current_password", "new_password"]);
  }

  protected getFieldIssue(field: ChangePasswordField): NewPasswordGuidanceKey | null {
    if (field === "current_password") return getSignInPasswordGuidance(this.values.current_password);
    return get_new_password_guidance(this.values.new_password, this.values.current_password);
  }
}
