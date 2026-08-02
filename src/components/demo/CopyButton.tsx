"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button className="maker-secondary-button" type="button" onClick={() => void copy()}>
      {copied ? "コピーしました" : label}
    </button>
  );
}
