"use client";

import { useEffect } from "react";

import Button from "./Button";
import styles from "./primitives.module.css";

type Variant = "success" | "error" | "info";

type Props = {
  open: boolean;
  message: string;
  variant?: Variant;
  autoHideMs?: number;
  onClose: () => void;
};

export default function Toast({ open, message, variant = "info", autoHideMs = 1800, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs, onClose, open]);

  if (!open) return null;

  const tone = variant === "error" ? styles.statusError : variant === "success" ? styles.statusSuccess : styles.statusInfo;

  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 85 }} aria-live="polite">
      <div className={[styles.status, tone].join(" ")}>
        <span>{message}</span>
        <Button variant="ghost" size="sm" onClick={onClose}>閉じる</Button>
      </div>
    </div>
  );
}
