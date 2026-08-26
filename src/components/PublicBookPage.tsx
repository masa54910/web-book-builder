"use client";

import Link from "next/link";
import { useEffect } from "react";

import BookReaderShell from "@/components/BookReaderShell";
import HomeBackLink from "@/components/HomeBackLink";
import { buildAuthorPagePath } from "@/lib/authorPage";
import type { PublishedReaderPayload } from "@/lib/publishedReaderTypes";
import { publicBookUrl } from "@/lib/promotion";
import { recordBookView } from "@/lib/readerAnalytics";

export default function PublicBookPage({ payload, slug }: { payload: PublishedReaderPayload | null; slug: string }) {
  useEffect(() => {
    if (payload) void recordBookView(payload.project.config.bookId, payload.bookId);
  }, [payload]);

  if (!payload) return <main className="empty-reader-page"><section><p className="maker-kicker">WebBookMaker</p><HomeBackLink /><h1>Web書籍が見つかりません</h1><p>公開停止、非公開、またはURLが変更された可能性があります。</p><Link className="maker-primary-link" href="/">WebBookMakerへ</Link></section></main>;
  const authorPageHandle = payload.authorPageHandle;
  return <BookReaderShell config={payload.project.config} chapters={payload.project.chapters} images={payload.project.images} contentBlocks={payload.project.contentBlocks} displayMode="published" cloudBookId={payload.bookId} shareUrl={publicBookUrl(slug)} shareDescription={payload.description} authorPageHandle={authorPageHandle} access={payload.access} accessSlug={payload.slug} backLink={authorPageHandle ? { href: buildAuthorPagePath(authorPageHandle), label: "作者プロフィールを見る" } : undefined} />;
}
