import { BaseForm } from "@/lib/forms/BaseForm";
import {
  get_email_guidance,
  get_sign_in_password_guidance,
  get_sign_up_password_guidance,
  type CredentialField,
  type GuidanceKey,
} from "@/lib/validation/credentials";

export type CredentialValues = Record<CredentialField, string>;

const CREDENTIAL_FIELDS: readonly CredentialField[] = ["email", "password"];
const EMPTY_CREDENTIALS: CredentialValues = { email: "", password: "" };

/** Sign-in: a well-formed email and any typed password (older accounts may predate the rules). */
export class SignInForm extends BaseForm<CredentialField, CredentialValues, GuidanceKey> {
  constructor() {
    super(EMPTY_CREDENTIALS, CREDENTIAL_FIELDS);
  }

  protected get_field_issue(field: CredentialField): GuidanceKey | null {
    const value = this.values[field];
    return field === "email" ? get_email_guidance(value) : get_sign_in_password_guidance(value);
  }
}

/** Sign-up: a well-formed email and a password meeting the shared sign-up rules. */
export class SignUpForm extends BaseForm<CredentialField, CredentialValues, GuidanceKey> {
  constructor() {
    super(EMPTY_CREDENTIALS, CREDENTIAL_FIELDS);
  }

  protected get_field_issue(field: CredentialField): GuidanceKey | null {
    const value = this.values[field];
    return field === "email" ? get_email_guidance(value) : get_sign_up_password_guidance(value);
  }
}
