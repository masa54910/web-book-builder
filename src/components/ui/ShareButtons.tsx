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
  disabled?: boolean;
  disabledReason?: string;
  onShared?: (platform: Exclude<Platform, "copy">) => void;
  onCopied?: () => void;
};

function ShareXIcon() {
  return <span className={styles.shareIcon} aria-hidden="true">X</span>;
}

function ShareNoteIcon() {
  return <span className={styles.shareIcon} aria-hidden="true">n</span>;
}

function ShareFacebookIcon() {
  return <span className={styles.shareIcon} aria-hidden="true">f</span>;
}

function ShareLineIcon() {
  return <span className={styles.shareIcon} aria-hidden="true">L</span>;
}

function ShareCopyIcon() {
  return <span className={styles.shareIcon} aria-hidden="true">◎</span>;
}

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
  disabled = false,
  disabledReason,
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

  const renderShareLink = (
    platform: Exclude<Platform, "copy">,
    href: string,
    label: string,
    icon: React.ReactNode,
    buttonClassName: string,
  ) => {
    if (!platforms.includes(platform)) return null;
    if (disabled) {
      return (
        <Button variant="secondary" size="sm" disabled className={buttonClassName} icon={icon}>
          {label}
        </Button>
      );
    }
    return (
      <Button href={href} openInNewTab variant="secondary" size="sm" className={buttonClassName} icon={icon} onClick={() => onShared?.(platform)}>
        {label}
      </Button>
    );
  };

  return (
    <div className={[styles.shareWrap, className].filter(Boolean).join(" ")} aria-label="共有ボタン">
      {showLabel ? <span className={styles.shareLabel}>SNSで共有</span> : null}
      {renderShareLink("x", createXUrl(url, title, description, hashtags), "Xで共有", <ShareXIcon />, styles.shareButtonX)}
      {renderShareLink("note", "https://note.com/", "noteで共有", <ShareNoteIcon />, styles.shareButtonNote)}
      {renderShareLink("facebook", createFacebookUrl(url), "Facebookで共有", <ShareFacebookIcon />, styles.shareButtonFacebook)}
      {renderShareLink("line", createLineUrl(url), "LINEで共有", <ShareLineIcon />, styles.shareButtonLine)}
      {platforms.includes("copy") ? (
        <Button variant="tertiary" size="sm" disabled={disabled} icon={<ShareCopyIcon />} onClick={() => void copy(url, "コピーしました", url)}>
          URLをコピー
        </Button>
      ) : null}
      {message ? <StatusMessage variant={message.includes("失敗") ? "error" : "success"} message={message} className="maker-status" /> : null}
      {!message && disabledReason ? <StatusMessage variant="info" message={disabledReason} className="maker-status" /> : null}
    </div>
  );
}
