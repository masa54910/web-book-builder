"use client";

import { useEffect, useState } from "react";

import { recordShare } from "@/lib/readerAnalytics";
import ShareButtons from "@/components/ui/ShareButtons";

export default function ShareTools({ bookId, cloudBookId, title }: { bookId: string; cloudBookId?: string; title: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setUrl(window.location.href), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!url) return null;

  return (
    <ShareButtons
      url={url}
      title={title}
      platforms={["x", "note", "facebook", "line", "copy"]}
      className="share-tools"
      onShared={() => recordShare(bookId, cloudBookId)}
      onCopied={() => recordShare(bookId, cloudBookId)}
    />
  );
}
