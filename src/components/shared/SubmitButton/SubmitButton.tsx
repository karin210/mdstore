import type { ReactElement } from "react";
import styles from "./SubmitButton.module.css";

interface SubmitButtonProps {
  label: string;
  /** Shown while the submission is in flight. */
  busyLabel: string;
  isBusy: boolean;
}

/**
 * Primary kind: submits a form (create account, sign in, post a prompt). Stays enabled while the
 * form is invalid and is only disabled during the request, keeping its width when the label changes.
 */
export function SubmitButton({ label, busyLabel, isBusy }: SubmitButtonProps): ReactElement {
  return (
    <button type="submit" className={styles.button} disabled={isBusy} aria-busy={isBusy}>
      <span data-visible={!isBusy}>{label}</span>
      <span data-visible={isBusy} aria-hidden={!isBusy}>
        {busyLabel}
      </span>
    </button>
  );
}
