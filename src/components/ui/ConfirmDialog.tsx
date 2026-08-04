"use client";

import { useEffect, useRef } from "react";

import Button from "./Button";
import GlassCard from "./GlassCard";
import styles from "./primitives.module.css";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  closeOnBackdrop?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "実行する",
  cancelLabel = "キャンセル",
  destructive = false,
  loading = false,
  closeOnBackdrop = true,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => {
      const firstButton = dialogRef.current?.querySelector("button");
      firstButton?.focus();
    }, 0);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onClick={() => {
        if (closeOnBackdrop) onCancel();
      }}
    >
      <GlassCard
        as="section"
        variant="elevated"
        padding="lg"
        className={styles.modalCard}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="confirm-dialog-title" className={styles.modalHeader}>{title}</h2>
          <p className={styles.modalDescription}>{description}</p>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
