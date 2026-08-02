"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";
import { listBooks, type CloudBookRecord } from "@/lib/bookRepository";

export default function AnalyticsOverviewPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<CloudBookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    listBooks(user.id)
      .then((rows) => {
        setBooks(rows);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "分析対象の作品を読み込めませんでした。");
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <main className="dashboard-page">
      <AppHeader />
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">Analytics</p>
          <HomeBackLink />
          <h1>作品分析</h1>
          <p>作品ごとの閲覧・読了・流入元を確認できます。まずは対象作品を選択してください。</p>
        </div>
        <Link className="maker-secondary-link" href="/dashboard">マイライブラリへ</Link>
      </div>

      {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
      {isLoading ? <div className="reader-loading">分析対象の作品を読み込んでいます…</div> : null}

      {!isLoading && !books.length ? (
        <section className="maker-card empty-library">
          <h2>分析対象の作品がありません</h2>
          <p>作品を作成して公開すると、ここに分析導線が表示されます。</p>
          <Link className="maker-primary-link" href="/books/new">作品を作成する</Link>
        </section>
      ) : null}

      <section className="book-list" aria-label="分析対象作品一覧">
        {books.map((book) => (
          <article className="book-list-card" key={book.id}>
            <div>
              <p className={`status-pill status-${book.status}`}>{book.status}</p>
              <h2>{book.title}</h2>
              <p>{book.description || "説明文は未設定です。"}</p>
              <small>
                公開日：{book.firstPublishedAt ? new Date(book.firstPublishedAt).toLocaleDateString("ja-JP") : "未公開"} / 最終更新：
                {new Date(book.updatedAt).toLocaleString("ja-JP")}
              </small>
            </div>
            <div className="book-list-actions">
              <Link className="maker-primary-link" href={`/analytics/${book.id}`}>分析を見る</Link>
              <Link className="maker-secondary-link" href={`/dashboard/books/${book.id}`}>管理へ</Link>
              {book.status === "published" ? (
                <Link className="maker-secondary-link" href={`/books/${book.slug}`}>公開ページ</Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
