"use client";

import { useState } from "react";

import { buildFacebookShareUrl, buildLineShareUrl, buildShareTemplate } from "@/lib/shareTemplates";
import { copyTextToClipboard } from "@/lib/shareClipboard";

import Button from "./Button";
import ServiceIcon from "./ServiceIcons";
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
  return <ServiceIcon service="x" className={styles.shareServiceIcon} />;
}

function ShareNoteIcon() {
  return <ServiceIcon service="note" className={styles.shareServiceIcon} />;
}

function ShareFacebookIcon() {
  return <ServiceIcon service="facebook" className={styles.shareServiceIcon} />;
}

function ShareLineIcon() {
  return <ServiceIcon service="line" className={styles.shareServiceIcon} />;
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
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setMessage(successText);
      onCopied?.();
    } else {
      if (fallbackText) window.prompt("コピーしてください", fallbackText);
      setMessage("コピーに失敗しました。手動でコピーしてください。");
    }
    window.setTimeout(() => setMessage(""), 1600);
  };

  const copyAndOpenTemplate = async (
    platform: "note" | "facebook",
    href: string,
    successText: string,
  ) => {
    const template = buildShareTemplate({ platform, title, description, url });
    const target = window.open("", "_blank", "noopener,noreferrer");
    const copied = await copyTextToClipboard(template);
    if (copied) {
      if (target) target.location.href = href;
      else window.open(href, "_blank", "noopener,noreferrer");
      setMessage(successText);
      onShared?.(platform);
    } else {
      target?.close();
      setMessage("テンプレートをコピーできませんでした。ブラウザのクリップボード許可を確認してください。");
    }
    window.setTimeout(() => setMessage(""), 2600);
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
      {platforms.includes("note") ? (
        <Button
          variant="secondary"
          size="sm"
          className={styles.shareButtonNote}
          icon={<ShareNoteIcon />}
          disabled={disabled}
          onClick={() => void copyAndOpenTemplate("note", "https://note.com/notes/new", "投稿用テンプレートをコピーしました。noteの記事画面で貼り付けてください。")}
        >
          noteへ投稿
        </Button>
      ) : null}
      {platforms.includes("facebook") ? (
        <Button
          variant="secondary"
          size="sm"
          className={styles.shareButtonFacebook}
          icon={<ShareFacebookIcon />}
          disabled={disabled}
          onClick={() => void copyAndOpenTemplate("facebook", buildFacebookShareUrl({ title, description, url }), "投稿用テンプレートをコピーしました。Facebookの投稿欄へ貼り付けてください。")}
        >
          Facebookへ投稿
        </Button>
      ) : null}
      {renderShareLink("line", buildLineShareUrl({ title, description, url }), "LINEで共有", <ShareLineIcon />, styles.shareButtonLine)}
      {platforms.includes("copy") ? (
        <Button variant="tertiary" size="sm" className={styles.shareButtonCopy} disabled={disabled} icon={<ShareCopyIcon />} onClick={() => void copy(url, "コピーしました", url)}>
          URLをコピー
        </Button>
      ) : null}
      {message ? <StatusMessage variant={message.includes("失敗") ? "error" : "success"} message={message} className="maker-status" /> : null}
      {!message && disabledReason ? <StatusMessage variant="info" message={disabledReason} className="maker-status" /> : null}
    </div>
  );
}
