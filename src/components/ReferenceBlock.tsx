"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";

const URL_PATTERN = /https?:\/\/[^\s　<>"'）】、。]+/g;

function stopPageFlip(event: SyntheticEvent) {
  event.stopPropagation();
}

function copyWithSelection(url: string) {
  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export function extractUrls(text: string) {
  return [...text.matchAll(URL_PATTERN)].map((match) => match[0]);
}

export default function ReferenceBlock({ url }: { url: string }) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyUrl = async (event: React.MouseEvent<HTMLButtonElement>, targetUrl: string) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(targetUrl);
    } catch {
      if (!copyWithSelection(targetUrl)) return;
    }
    setCopiedUrl(targetUrl);
    window.setTimeout(() => {
      setCopiedUrl((current) => (current === targetUrl ? null : current));
    }, 1600);
  };

  return (
    <div
      className="reference-block"
      onPointerDown={stopPageFlip}
      onMouseDown={stopPageFlip}
      onTouchStart={stopPageFlip}
      onClick={stopPageFlip}
    >
      <span className="reference-url-group">
        <span className="reference-url">{url}</span>
        <button
          type="button"
          className="reference-copy-button"
          aria-label={`${url}をコピー`}
          onPointerDown={stopPageFlip}
          onMouseDown={stopPageFlip}
          onTouchStart={stopPageFlip}
          onClick={(event) => void copyUrl(event, url)}
        >
          {copiedUrl === url ? "コピーしました" : "コピー"}
        </button>
      </span>
      <span className="sr-only" aria-live="polite">
        {copiedUrl ? "URLをコピーしました" : ""}
      </span>
    </div>
  );
}
