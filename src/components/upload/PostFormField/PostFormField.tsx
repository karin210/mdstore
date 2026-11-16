import type { ReactElement, ReactNode } from "react";

interface PostFormFieldProps {
  id: string;
  label: string;
  hint?: string;
  /** What is wrong with the value, once the field was edited; empty when there is nothing to say. */
  guidanceText: string;
  /** The control; it must reference `${id}-hint` and `${id}-guidance` in aria-describedby. */
  children: ReactNode;
}

/** Label, control, a short description and the inline guidance below, for one upload-form field. */
export function PostFormField({ id, label, hint, guidanceText, children }: PostFormFieldProps): ReactElement {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="form-hint">
          {hint}
        </p>
      )}
      <p id={`${id}-guidance`} className="form-guidance" aria-live="polite" hidden={guidanceText === ""}>
        {guidanceText}
      </p>
    </div>
  );
}

/** The aria-describedby value for a field rendered with PostFormField. */
export function getDescribedBy(id: string, hasHint: boolean): string {
  return hasHint ? `${id}-hint ${id}-guidance` : `${id}-guidance`;
}
