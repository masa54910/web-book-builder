"use client";

import { useState } from "react";

import Button from "./Button";
import StatusMessage from "./StatusMessage";
import styles from "./primitives.module.css";

type Platform = "x" | "note" | "facebook" | "line" | "copy";

type Props = {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  platforms?: Platform[];
  showLabel?: boolean;
  className?: string;
  onShared?: (platform: Exclude<Platform, "copy">) => void;
  onCopied?: () => void;
};

function createXUrl(url: string, title: string, description?: string, hashtags?: string[]) {
  const text = [title, description].filter(Boolean).join(" ");
  const query = new URLSearchParams({
    url,
    text,
  });
  if (hashtags?.length) query.set("hashtags", hashtags.join(","));
  return `https://twitter.com/intent/tweet?${query.toString()}`;
}

function createLineUrl(url: string) {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

function createFacebookUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export default function ShareButtons({
  url,
  title,
  description,
  hashtags,
  platforms = ["x", "note", "facebook", "line", "copy"],
  showLabel = true,
  className,
  onShared,
  onCopied,
}: Props) {
  const [message, setMessage] = useState<string>("");

  const copy = async (text: string, successText: string, fallbackText?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successText);
      onCopied?.();
    } catch {
      if (fallbackText) {
        window.prompt("コピーしてください", fallbackText);
      }
      setMessage("コピーに失敗しました。手動でコピーしてください。");
    }
    window.setTimeout(() => setMessage(""), 1600);
  };

  return (
    <div className={[styles.shareWrap, className].filter(Boolean).join(" ")} aria-label="共有ボタン">
      {showLabel ? <span>共有</span> : null}
      {platforms.includes("x") ? (
        <Button href={createXUrl(url, title, description, hashtags)} openInNewTab variant="secondary" size="sm" className={styles.shareButtonX} onClick={() => onShared?.("x")}>
          X
        </Button>
      ) : null}
      {platforms.includes("note") ? (
        <Button href="https://note.com/" openInNewTab variant="secondary" size="sm" className={styles.shareButtonNote} onClick={() => onShared?.("note")}>
          note
        </Button>
      ) : null}
      {platforms.includes("facebook") ? (
        <Button href={createFacebookUrl(url)} openInNewTab variant="secondary" size="sm" className={styles.shareButtonFacebook} onClick={() => onShared?.("facebook")}>
          Facebook
        </Button>
      ) : null}
      {platforms.includes("line") ? (
        <Button href={createLineUrl(url)} openInNewTab variant="secondary" size="sm" className={styles.shareButtonLine} onClick={() => onShared?.("line")}>
          LINE
        </Button>
      ) : null}
      {platforms.includes("copy") ? (
        <Button variant="tertiary" size="sm" onClick={() => void copy(url, "URLをコピーしました", url)}>
          URLコピー
        </Button>
      ) : null}
      {message ? <StatusMessage variant={message.includes("失敗") ? "error" : "success"} message={message} className="maker-status" /> : null}
    </div>
  );
}
