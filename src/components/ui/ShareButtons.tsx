"use client";

import { useState } from "react";

import { buildFacebookShareUrl, buildLineShareUrl, buildShareTemplate, NOTE_NEW_POST_URL } from "@/lib/shareTemplates";
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

function isMobileDevice() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  const [noteReady, setNoteReady] = useState(false);

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

  const copyNoteTemplate = async () => {
    const template = buildShareTemplate({ platform: "note", title, description, url });
    const copied = await copyTextToClipboard(template);
    setNoteReady(copied);
    setMessage(copied
      ? "投稿テンプレートをコピーしました。noteの記事本文へ貼り付けてください。"
      : "テンプレートをコピーできませんでした。ブラウザのクリップボード許可を確認してください。");
    window.setTimeout(() => setMessage(""), 2600);
  };

  const shareLine = async () => {
    const lineTemplate = buildShareTemplate({ platform: "line", title, description, url });
    const lineUrl = buildLineShareUrl({ title, description, url });
    if (isMobileDevice() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: lineTemplate, url });
        onShared?.("line");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (isMobileDevice()) {
      window.location.assign(lineUrl);
      onShared?.("line");
      return;
    }
    setMessage("PCブラウザではLINE共有画面を直接開けない場合があります。共有文をコピーしてください。");
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
        <>
          <Button
            variant="secondary"
            size="sm"
            className={styles.shareButtonNote}
            icon={<ShareNoteIcon />}
            disabled={disabled}
            onClick={() => void copyNoteTemplate()}
          >
            テンプレートをコピー
          </Button>
          {!disabled && noteReady ? (
            <Button
              href={NOTE_NEW_POST_URL}
              openInNewTab
              variant="secondary"
              size="sm"
              className={styles.shareButtonNote}
              icon={<ShareNoteIcon />}
              onClick={() => onShared?.("note")}
            >
              noteを開く
            </Button>
          ) : null}
        </>
      ) : null}
      {renderShareLink("facebook", buildFacebookShareUrl({ title, description, url }), "Facebookで共有", <ShareFacebookIcon />, styles.shareButtonFacebook)}
      {platforms.includes("facebook") ? (
        <Button
          variant="tertiary"
          size="sm"
          className={styles.shareButtonCopy}
          disabled={disabled}
          onClick={() => void copy(
            buildShareTemplate({ platform: "facebook", title, description, url }),
            "投稿文をコピーしました。",
            buildShareTemplate({ platform: "facebook", title, description, url }),
          )}
        >
          投稿文をコピー
        </Button>
      ) : null}
      {platforms.includes("line") ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={styles.shareButtonLine}
            icon={<ShareLineIcon />}
            disabled={disabled}
            onClick={() => void shareLine()}
          >
            LINEで共有
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            className={styles.shareButtonCopy}
            disabled={disabled}
            onClick={() => void copy(
              buildShareTemplate({ platform: "line", title, description, url }),
              "共有文をコピーしました。",
              buildShareTemplate({ platform: "line", title, description, url }),
            )}
          >
            共有文をコピー
          </Button>
        </>
      ) : null}
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
