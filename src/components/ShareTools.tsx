"use client";

import ReaderShareCenter from "@/components/ReaderShareCenter";

export default function ShareTools({
  bookId,
  cloudBookId,
  title,
  description,
  shareUrl,
  shareDisabledReason,
}: {
  bookId: string;
  cloudBookId?: string;
  title: string;
  description?: string;
  shareUrl?: string;
  shareDisabledReason?: string;
}) {
  if (!shareUrl && !shareDisabledReason) return null;

  if (!shareUrl) {
    return (
      <section className="reader-share-center promotion-center maker-card" aria-label="共有">
        <p className="maker-status" role="status">{shareDisabledReason}</p>
      </section>
    );
  }

  return (
    <ReaderShareCenter
      bookId={bookId}
      cloudBookId={cloudBookId}
      title={title}
      description={description}
      shareUrl={shareUrl}
    />
  );
}
