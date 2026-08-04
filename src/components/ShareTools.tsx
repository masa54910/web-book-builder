"use client";

import { recordShare } from "@/lib/readerAnalytics";
import ShareButtons from "@/components/ui/ShareButtons";

export default function ShareTools({
  bookId,
  cloudBookId,
  title,
  shareUrl,
  shareDisabledReason,
}: {
  bookId: string;
  cloudBookId?: string;
  title: string;
  shareUrl?: string;
  shareDisabledReason?: string;
}) {
  if (!shareUrl && !shareDisabledReason) return null;

  return (
    <ShareButtons
      url={shareUrl || ""}
      title={title}
      platforms={["x", "note", "facebook", "line", "copy"]}
      className="share-tools"
      disabled={!shareUrl}
      disabledReason={shareDisabledReason}
      onShared={() => recordShare(bookId, cloudBookId)}
      onCopied={() => recordShare(bookId, cloudBookId)}
    />
  );
}
