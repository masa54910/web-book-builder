"use client";

import { useEffect, useState } from "react";

import { recordShare } from "@/lib/readerAnalytics";

function shareUrl(platform: "x" | "facebook" | "line", url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);
  if (platform === "x") return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  if (platform === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  return `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;
}

export default function ShareTools({ bookId, cloudBookId, title }: { bookId: string; cloudBookId?: string; title: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setUrl(window.location.href), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    recordShare(bookId, cloudBookId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (!url) return null;

  return (
    <div className="share-tools" aria-label="作品を共有">
      <span>共有</span>
      <a href={shareUrl("x", url, title)} target="_blank" rel="noreferrer" onClick={() => recordShare(bookId, cloudBookId)}>
        X
      </a>
      <a href={shareUrl("facebook", url, title)} target="_blank" rel="noreferrer" onClick={() => recordShare(bookId, cloudBookId)}>
        Facebook
      </a>
      <a href={shareUrl("line", url, title)} target="_blank" rel="noreferrer" onClick={() => recordShare(bookId, cloudBookId)}>
        LINE
      </a>
      <button type="button" onClick={() => void copy()}>
        {copied ? "コピーしました" : "URLコピー"}
      </button>
    </div>
  );
}
