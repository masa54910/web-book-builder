"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import {
  normalizeAuthorPageHandle,
  type PublicAuthorBook,
  type PublicAuthorPageData,
} from "@/lib/authorPage";

function AuthorAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string }) {
  const [hasError, setHasError] = useState(false);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "W";

  if (!avatarUrl || hasError) {
    return (
      <div className="author-avatar" aria-label={`${displayName}のプロフィール画像`}>
        <span aria-hidden="true">{initial}</span>
      </div>
    );
  }

  return (
    <div className="author-avatar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={`${displayName}のプロフィール画像`}
        loading="eager"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function AuthorBookCover({ book, priority }: { book: PublicAuthorBook; priority: boolean }) {
  const [hasError, setHasError] = useState(false);

  if (!book.coverUrl || hasError) {
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
      <img
        src={book.coverUrl}
        alt={`${book.title}の表紙`}
        loading={priority ? "eager" : "lazy"}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function estimateReadingMinutes(book: PublicAuthorBook) {
  const minutes = Math.max(1, Math.ceil((book.description.length + book.title.length) / 120));
  return `${minutes}分`;
}

export default function AuthorPage({ initialData }: { initialData?: PublicAuthorPageData }) {
  const params = useParams<{ handle: string }>();
  const handle = normalizeAuthorPageHandle(params.handle || "");
  const [data, setData] = useState<PublicAuthorPageData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(Boolean(!initialData && handle));
  const [message, setMessage] = useState(handle ? "" : "作者ページが見つかりません。");

  useEffect(() => {
    if (initialData) return;
    if (!handle) return;

    let active = true;
    fetch(`/api/authors/${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("AUTHOR_NOT_FOUND");
        return (await response.json()) as PublicAuthorPageData;
      })
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setData(null);
        setMessage(
          error instanceof Error && error.message === "AUTHOR_NOT_FOUND"
            ? "作者ページが見つかりません。"
            : "作者ページを読み込めませんでした。",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [handle, initialData]);

  const profile = data?.profile;
  const links = useMemo(() => {
    if (!profile) return data?.links || [];
    const profileWebsite = profile.websiteUrl && !data?.links.some((link) => link.url === profile.websiteUrl)
      ? [{ label: "Webサイト", url: profile.websiteUrl, linkType: "website" as const }]
      : [];
    return [...(data?.links || []), ...profileWebsite];
  }, [data?.links, profile]);

  return (
    <main className="author-page">
      <AppHeader />
      <section className="author-hero" aria-labelledby="author-page-title">
        {profile ? <AuthorAvatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} /> : null}
        <div className="author-profile-copy">
          <p className="maker-kicker">Author page</p>
          <HomeBackLink />
          <h1 id="author-page-title">{profile?.displayName || (handle ? `@${handle}` : "作者ページ")}</h1>
          {profile ? <p className="author-handle">@{profile.handle}</p> : null}
          {profile?.bio ? <p className="author-bio">{profile.bio}</p> : null}
          {links.length ? (
            <div className="author-links" aria-label="作者の外部リンク">
              {links.map((link) => (
                <a key={`${link.linkType}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.label}を開く`}>
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="author-books" aria-labelledby="author-books-title">
        <div className="dashboard-heading compact-heading">
          <div>
            <p className="maker-kicker">Published works</p>
            <h2 id="author-books-title">公開作品</h2>
          </div>
        </div>
        {isLoading ? <div className="reader-loading">作品を読み込んでいます…</div> : null}
        {message ? <p className="maker-status" role="status">{message}</p> : null}
        {!isLoading && !data ? (
          <section className="maker-card empty-library">
            <h2>作者ページが見つかりません</h2>
            <p>URLを確認するか、作者ページの公開設定を確認してください。</p>
          </section>
        ) : null}
        {!isLoading && data && !data.books.length ? (
          <section className="maker-card empty-library">
            <h2>まだ公開作品はありません。</h2>
            <p>作者が作品を公開すると、このページに一覧表示されます。</p>
          </section>
        ) : null}
        <div className="author-book-grid">
          {data?.books.map((book, index) => (
            <article className="author-book-card" key={book.slug}>
              <AuthorBookCover book={book} priority={index < 2} />
              <div className="author-book-card-copy">
                <h3>{book.title || "無題のWebブック"}</h3>
                <p>{book.description || "WebBookMakerで公開されている作品です。"}</p>
                {book.updatedAt ? <small>更新：{new Date(book.updatedAt).toLocaleDateString("ja-JP")} / 読了目安：{estimateReadingMinutes(book)}</small> : null}
                <Link className="maker-secondary-link" href={`/books/${encodeURIComponent(book.slug)}`}>
                  Webブックを読む
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
