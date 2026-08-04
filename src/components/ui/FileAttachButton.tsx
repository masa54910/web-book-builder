"use client";

import { useRef } from "react";

import Button from "./Button";

type Props = {
  accept: string;
  disabled?: boolean;
  label?: string;
  onSelect: (file: File | null) => void;
};

export default function FileAttachButton({ accept, disabled, label = "ファイルを添付", onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onSelect(file);
          event.currentTarget.value = "";
        }}
      />
      <Button variant="secondary" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
    </>
  );
}
