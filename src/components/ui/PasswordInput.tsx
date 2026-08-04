"use client";

import { useState } from "react";

import Button from "./Button";
import styles from "./primitives.module.css";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  error?: boolean;
};

export default function PasswordInput({ id, value, onChange, autoComplete, disabled, error }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={styles.passwordRow}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        className={[styles.inputBase, error ? styles.inputError : ""].filter(Boolean).join(" ")}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        variant="tertiary"
        size="sm"
        type="button"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        ariaLabel={visible ? "パスワードを隠す" : "パスワードを表示"}
      >
        {visible ? "隠す" : "表示"}
      </Button>
    </span>
  );
}
