"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import { materializeBookProjectAssets, resolveStorageUrl } from "@/lib/bookAssetStorage";
import { listPublishedBooksByAuthorHandle, type CloudBookRecord } from "@/lib/bookRepository";

function AuthorBookCover({ book }: { book: CloudBookRecord }) {
  const [hasError, setHasError] = useState(false);
  const coverUrl = book.coverPath || book.bookProject.config.coverImageUrl || "";

  if (!coverUrl || hasError) {
    return (
      <div className="author-book-cover author-book-cover-fallback" aria-label={`${book.title}の表紙`}>
        <span className="author-book-cover-fallback-title">{book.title || "WebBookMaker"}</span>
        <small>WebBookMaker</small>
      </div>
    );
  }

  return (
    <div className="author-book-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={coverUrl} alt={`${book.title}の表紙`} onError={() => setHasError(true)} />
    </div>
  );
}

function estimateReadingMinutes(book: CloudBookRecord) {
  const minutes = Math.max(1, Math.ceil(book.rawText.length / 600));
  return `${minutes}分`;
}

export default function AuthorPage() {
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params.handle || "").replace(/^@+/, "");
  const [books, setBooks] = useState<CloudBookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!handle) return;
    listPublishedBooksByAuthorHandle(handle)
      .then(async (records) => {
        const hydrated = await Promise.all(
          records.map(async (book) => {
            const bookProject = await materializeBookProjectAssets(book.bookProject);
            const coverPath = bookProject.config.coverImageUrl || await resolveStorageUrl(book.coverPath);
            return { ...book, bookProject, coverPath };
          }),
        );
        setBooks(hydrated);
      })
      .catch(() => setMessage("作者ページを読み込めませんでした。"))
      .finally(() => setIsLoading(false));
  }, [handle]);

  const profile = useMemo(() => books[0]?.bookProject.config.authorProfile, [books]);
  const displayName = profile?.displayName || books[0]?.authorName || `@${handle}`;

  return (
    <main className="author-page">
      <AppHeader />
      <section className="author-hero">
        <div className="author-avatar" aria-hidden="true">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="maker-kicker">Author page</p>
          <HomeBackLink />
          <h1>{displayName}</h1>
          <p className="author-handle">@{handle}</p>
          <p>{profile?.bio || "この作者の公開作品一覧です。"}</p>
          {profile?.snsLinks.length ? (
            <div className="author-links">
              {profile.snsLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="author-books">
        <div className="dashboard-heading compact-heading">
          <div>
            <p className="maker-kicker">Published works</p>
            <h2>公開作品</h2>
          </div>
        </div>
        {isLoading ? <div className="reader-loading">作品を読み込んでいます…</div> : null}
        {message ? <p className="maker-status">{message}</p> : null}
        {!isLoading && !books.length ? (
          <section className="maker-card empty-library">
            <h2>公開作品はまだありません</h2>
            <p>作者が作品を公開すると、このページに一覧表示されます。</p>
          </section>
        ) : null}
        <div className="author-book-grid">
          {books.map((book) => (
            <article className="author-book-card" key={book.id}>
              <AuthorBookCover book={book} />
              <div>
                <h3>{book.title}</h3>
                <p>{book.description || "説明文は未設定です。"}</p>
                <small>
                  更新：{new Date(book.updatedAt).toLocaleDateString("ja-JP")} / 読了目安：
                  {estimateReadingMinutes(book)}
                </small>
                <Link className="maker-secondary-link" href={`/books/${book.slug}`}>
                  読む
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
