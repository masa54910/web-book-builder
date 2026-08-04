"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./primitives.module.css";

type Variant = "primary" | "secondary" | "tertiary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

type LinkProps = CommonProps & {
  href: string;
  onClick?: () => void;
  openInNewTab?: boolean;
};

type NativeButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
  href?: undefined;
};

export type ButtonProps = LinkProps | NativeButtonProps;

function joinClasses(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function variantClassName(variant: Variant) {
  if (variant === "primary") return styles.buttonPrimary;
  if (variant === "secondary") return styles.buttonSecondary;
  if (variant === "tertiary") return styles.buttonTertiary;
  if (variant === "danger") return styles.buttonDanger;
  return styles.buttonGhost;
}

function sizeClassName(size: Size) {
  if (size === "sm") return styles.buttonSm;
  if (size === "lg") return styles.buttonLg;
  return styles.buttonMd;
}

export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    icon,
    iconPosition = "left",
    className,
    children,
    ariaLabel,
  } = props;

  const classes = joinClasses([
    styles.buttonBase,
    variantClassName(variant),
    sizeClassName(size),
    fullWidth && styles.buttonFullWidth,
    ("disabled" in props && props.disabled) || loading ? styles.buttonDisabled : "",
    className,
  ]);

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : iconPosition === "left" ? icon : null}
      <span>{children}</span>
      {!loading && iconPosition === "right" ? icon : null}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        aria-label={ariaLabel}
        className={classes}
        onClick={props.onClick}
        target={props.openInNewTab ? "_blank" : undefined}
        rel={props.openInNewTab ? "noopener noreferrer" : undefined}
      >
        {content}
      </Link>
    );
  }

  const nativeProps = props as NativeButtonProps;
  const { type = "button", disabled, ...rest } = nativeProps;

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {content}
    </button>
  );
}
