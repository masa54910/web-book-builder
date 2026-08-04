import type { ReactNode } from "react";

import styles from "./primitives.module.css";

type Variant = "default" | "subtle" | "elevated" | "pricing" | "analytics" | "content";
type Padding = "sm" | "md" | "lg";

type Props = {
  as?: "div" | "section" | "article";
  variant?: Variant;
  padding?: Padding;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

function joinClasses(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function variantClassName(variant: Variant) {
  if (variant === "subtle") return styles.cardSubtle;
  if (variant === "elevated") return styles.cardElevated;
  if (variant === "pricing") return styles.cardPricing;
  if (variant === "analytics") return styles.cardAnalytics;
  if (variant === "content") return styles.cardContent;
  return styles.cardDefault;
}

function padClassName(padding: Padding) {
  if (padding === "sm") return styles.cardPadSm;
  if (padding === "lg") return styles.cardPadLg;
  return styles.cardPadMd;
}

export default function GlassCard({
  as = "section",
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  children,
}: Props) {
  const Tag = as;
  return (
    <Tag
      className={joinClasses([
        styles.cardBase,
        variantClassName(variant),
        padClassName(padding),
        interactive && styles.cardInteractive,
        className,
      ])}
    >
      {children}
    </Tag>
  );
}
