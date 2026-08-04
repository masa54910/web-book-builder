import type { ReactNode } from "react";

import styles from "./primitives.module.css";

type Props = {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export default function FormField({
  id,
  label,
  required = false,
  helpText,
  error,
  className,
  children,
}: Props) {
  return (
    <label className={[styles.field, className].filter(Boolean).join(" ")} htmlFor={id}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? <span className={styles.requiredDot}>必須</span> : null}
      </span>
      {children}
      {helpText ? <small id={`${id}-help`} className={styles.fieldHelp}>{helpText}</small> : null}
      <small id={`${id}-error`} className={styles.fieldError} aria-live="polite">
        {error || ""}
      </small>
    </label>
  );
}
