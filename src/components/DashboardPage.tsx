"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  duplicateBook,
  listBooks,
  softDeleteBook,
  updatePublication,
  type CloudBookRecord,
} from "@/lib/bookRepository";
import { trackEvent } from "@/lib/analytics";
import { summarizeAnalytics } from "@/lib/readerAnalytics";

type SortKey = "updated" | "title" | "status";

export default function DashboardPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<CloudBookRecord[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const reload = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setBooks(await listBooks(user.id));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "作品一覧を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const visibleBooks = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const filtered = lower
      ? books.filter((book) =>
          [book.title, book.authorName, book.slug, book.description].some((value) =>
            value.toLowerCase().includes(lower),
          ),
        )
      : books;
    return [...filtered].sort((left, right) => {
      if (sortKey === "title") return left.title.localeCompare(right.title, "ja");
      if (sortKey === "status") return left.status.localeCompare(right.status);
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [books, query, sortKey]);

  const duplicate = async (book: CloudBookRecord) => {
    if (!user) return;
    try {
      await duplicateBook(book.id, user.id);
      trackEvent("book_duplicated", { bookId: book.id });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "複製に失敗しました。");
    }
  };

  const archive = async (book: CloudBookRecord) => {
    if (!user || !window.confirm(`「${book.title}」をライブラリから削除します。よろしいですか？`)) return;
    try {
      await softDeleteBook(book.id, user.id);
      trackEvent("book_archived", { bookId: book.id });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除に失敗しました。");
    }
  };

  const togglePublished = async (book: CloudBookRecord) => {
    if (!user) return;
    try {
      await updatePublication(book.id, user.id, {
        status: book.status === "published" ? "draft" : "published",
        visibility: book.status === "published" ? "private" : book.visibility === "private" ? "unlisted" : book.visibility,
      });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "公開状態の変更に失敗しました。");
    }
  };

  return (
    <main className="dashboard-page">
      <AppHeader />
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">My library</p>
          <h1>マイライブラリ</h1>
          <p>作成したWeb書籍の保存、編集、公開URL管理を行います。</p>
        </div>
        <Link className="maker-primary-link" href="/books/new">
          新しい作品を作る
        </Link>
      </div>

      <section className="maker-card dashboard-toolbar">
        <label>
          <span>検索</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル・著者・URLで検索" />
        </label>
        <label>
          <span>並び替え</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="updated">更新が新しい順</option>
            <option value="title">タイトル順</option>
            <option value="status">公開状態順</option>
          </select>
        </label>
      </section>

      {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
      {isLoading ? <div className="reader-loading">作品一覧を読み込んでいます…</div> : null}

      {!isLoading && !visibleBooks.length ? (
        <section className="maker-card empty-library">
          <h2>作品はまだありません</h2>
          <p>最初の1冊を作成して、Web書籍のプレビューと公開URLを試しましょう。</p>
          <Link className="maker-primary-link" href="/books/new">
            新しい作品を作る
          </Link>
        </section>
      ) : null}

      <section className="book-list" aria-label="作品一覧">
        {visibleBooks.map((book) => (
          <article className="book-list-card" key={book.id}>
            <div>
              <p className={`status-pill status-${book.status}`}>{book.status}</p>
              <h2>{book.title}</h2>
              <p>{book.description || "説明文は未設定です。"}</p>
              <small>
                更新：{book.updatedAt ? new Date(book.updatedAt).toLocaleString("ja-JP") : "不明"} / URL：
                {book.status === "published" ? `/books/${book.slug}` : "未公開"}
              </small>
              <div className="analytics-strip" aria-label="閲覧解析サマリー">
                {(() => {
                  const summary = summarizeAnalytics(book.bookProject.config.bookId);
                  return (
                    <>
                      <span>閲覧 {summary.views}</span>
                      <span>読了率 {summary.completionRate}%</span>
                      <span>共有 {summary.shares}</span>
                      <span>
                        人気章 {summary.popularChapters[0]?.title || "未計測"}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="book-list-actions">
              <Link className="maker-secondary-link" href={`/dashboard/books/${book.id}`}>
                管理
              </Link>
              <Link className="maker-secondary-link" href={`/dashboard/books/${book.id}/edit`}>
                編集
              </Link>
              {book.status === "published" ? (
                <Link className="maker-secondary-link" href={`/books/${book.slug}`}>
                  公開ページ
                </Link>
              ) : null}
              <button className="maker-small-button" type="button" onClick={() => void duplicate(book)}>
                複製
              </button>
              <button className="maker-small-button" type="button" onClick={() => void togglePublished(book)}>
                {book.status === "published" ? "公開停止" : "限定公開"}
              </button>
              <button className="maker-small-button danger" type="button" onClick={() => void archive(book)}>
                削除
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
