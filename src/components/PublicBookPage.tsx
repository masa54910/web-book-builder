"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import BookReaderShell from "@/components/BookReaderShell";
import HomeBackLink from "@/components/HomeBackLink";
import { buildAuthorPagePath } from "@/lib/authorPage";
import { canReadPublishedBook } from "@/lib/accessControl";
import { materializeBookProjectAssets } from "@/lib/bookAssetStorage";
import { getPublishedBookBySlug, type CloudBookRecord } from "@/lib/bookRepository";
import { getPublicAuthorHandle } from "@/lib/profileRepository";
import { publicBookUrl } from "@/lib/promotion";
import { recordBookView } from "@/lib/readerAnalytics";

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const [book, setBook] = useState<CloudBookRecord | null>(null);
  const [authorPageHandle, setAuthorPageHandle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!params.slug) return;
    getPublishedBookBySlug(decodeURIComponent(params.slug))
      .then(async (record) => {
        if (record) {
          const canonicalAuthorHandle = await getPublicAuthorHandle(record.ownerId);
          setAuthorPageHandle(canonicalAuthorHandle || null);
          setBook({ ...record, bookProject: await materializeBookProjectAssets(record.bookProject) });
          return;
        }
        setAuthorPageHandle(null);
        setBook(record);
        if (!record) setMessage("公開中のWeb書籍が見つかりません。");
      })
      .catch(() => setMessage("Web書籍を読み込めませんでした。"))
      .finally(() => setIsLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (book) recordBookView(book.bookProject.config.bookId, book.id);
  }, [book]);

  if (isLoading) return <div className="reader-loading">公開Web書籍を読み込んでいます…</div>;
  if (!book || !canReadPublishedBook(book)) {
    return (
      <main className="empty-reader-page">
        <section>
          <p className="maker-kicker">WebBookMaker</p>
          <HomeBackLink />
          <h1>Web書籍が見つかりません</h1>
          <p>{message || "公開停止、非公開、またはURLが変更された可能性があります。"}</p>
          <Link className="maker-primary-link" href="/">WebBookMakerへ</Link>
        </section>
      </main>
    );
  }

  return (
    <BookReaderShell
      config={book.bookProject.config}
      chapters={book.bookProject.chapters}
      images={book.bookProject.images}
      contentBlocks={book.bookProject.contentBlocks}
      displayMode="published"
      cloudBookId={book.id}
      shareUrl={publicBookUrl(decodeURIComponent(params.slug))}
      shareDescription={book.description}
      authorPageHandle={authorPageHandle}
      backLink={
        authorPageHandle
          ? {
              href: buildAuthorPagePath(authorPageHandle),
              label: "作者プロフィールを見る",
            }
          : undefined
      }
    />
  );
}
