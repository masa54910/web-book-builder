"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StatusMessage from "@/components/ui/StatusMessage";
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

      {message ? <StatusMessage message={message} className="maker-status" /> : null}
      {isLoading ? <LoadingState label="分析対象の作品を読み込んでいます…" className="reader-loading" /> : null}

      {!isLoading && !books.length ? (
        <section className="maker-card empty-library">
          <EmptyState
            title="分析対象の作品がありません"
            description="作品を作成して公開すると、ここに分析導線が表示されます。"
            action={{ label: "作品を作成する", href: "/books/new" }}
          />
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
              <Button href={`/analytics/${book.id}`} size="sm">分析を見る</Button>
              <Button href={`/dashboard/books/${book.id}`} variant="secondary" size="sm">管理へ</Button>
              {book.status === "published" ? (
                <Button href={`/books/${book.slug}`} variant="secondary" size="sm" openInNewTab>
                  公開ページ
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
