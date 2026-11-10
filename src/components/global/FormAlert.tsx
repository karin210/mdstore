import type { ReactElement, ReactNode } from "react";
import { AlertIcon, CheckCircleIcon } from "@/components/global/icons";

interface FormAlertProps {
  tone: "error" | "success";
  children: ReactNode;
}

/**
 * A form-level message (submission error or result). The status colour stays on the border and
 * icon, the text stays in the body colour, and the role makes screen readers announce it.
 */
export function FormAlert({ tone, children }: FormAlertProps): ReactElement {
  return (
    <p className="form-alert" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      {tone === "error" ? <AlertIcon /> : <CheckCircleIcon />}
      <span>{children}</span>
    </p>
  );
}
