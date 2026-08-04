import styles from "./primitives.module.css";

type Variant = "success" | "error" | "warning" | "info";

type Props = {
  variant?: Variant;
  message: string;
  ariaLive?: "polite" | "assertive";
  className?: string;
};

function joinClasses(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function variantClassName(variant: Variant) {
  if (variant === "success") return styles.statusSuccess;
  if (variant === "error") return styles.statusError;
  if (variant === "warning") return styles.statusWarning;
  return styles.statusInfo;
}

function iconFor(variant: Variant) {
  if (variant === "success") return "✓";
  if (variant === "error") return "!";
  if (variant === "warning") return "△";
  return "i";
}

export default function StatusMessage({
  variant = "info",
  message,
  ariaLive = "polite",
  className,
}: Props) {
  return (
    <p className={joinClasses([styles.status, variantClassName(variant), className])} aria-live={ariaLive}>
      <span aria-hidden="true">{iconFor(variant)}</span>
      <span>{message}</span>
    </p>
  );
}
