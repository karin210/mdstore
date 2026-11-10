import type { ReactElement } from "react";
import styles from "./SubmitButton.module.css";

interface SubmitButtonProps {
  label: string;
  /** Shown while the submission is in flight. */
  busy_label: string;
  is_busy: boolean;
}

/**
 * Primary kind: submits a form (create account, sign in, post a prompt). Stays enabled while the
 * form is invalid and is only disabled during the request, keeping its width when the label changes.
 */
export function SubmitButton({ label, busy_label, is_busy }: SubmitButtonProps): ReactElement {
  return (
    <button type="submit" className={styles.button} disabled={is_busy} aria-busy={is_busy}>
      <span data-visible={!is_busy}>{label}</span>
      <span data-visible={is_busy} aria-hidden={!is_busy}>
        {busy_label}
      </span>
    </button>
  );
}
