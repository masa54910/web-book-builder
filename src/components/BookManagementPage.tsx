"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import PromotionCenter from "@/components/PromotionCenter";
import { useAuth } from "@/lib/auth/AuthContext";
import { getBook, updatePublication, type CloudBookRecord } from "@/lib/bookRepository";
import { summarizeCloudAnalytics } from "@/lib/readerAnalytics";

type CloudAnalyticsSummary = Awaited<ReturnType<typeof summarizeCloudAnalytics>>;

export default function BookManagementPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [book, setBook] = useState<CloudBookRecord | null>(null);
  const [analytics, setAnalytics] = useState<CloudAnalyticsSummary>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || !params.id) return;
    getBook(params.id, user.id)
      .then((record) => {
        setBook(record);
        if (record) {
          summarizeCloudAnalytics(record.id)
            .then(setAnalytics)
            .catch(() => setAnalytics(null));
        }
      })
      .catch(() => setMessage("作品を読み込めませんでした。"));
  }, [params.id, user]);

  const setPublication = async (status: "draft" | "published", visibility: "private" | "unlisted" | "public") => {
    if (!user || !book) return;
    try {
      const next = await updatePublication(book.id, user.id, { status, visibility });
      setBook(next);
      setMessage(status === "published" ? "公開状態を更新しました。" : "公開を停止しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "公開設定の更新に失敗しました。");
    }
  };

  return (
    <main className="dashboard-page">
      <AppHeader />
      {!book ? (
        <section className="maker-card">
          <h1>作品管理</h1>
          <p>{message || "作品を読み込んでいます…"}</p>
          <Link className="maker-secondary-link" href="/dashboard">戻る</Link>
        </section>
      ) : (
        <>
          <div className="dashboard-heading">
            <div>
              <p className="maker-kicker">Book settings</p>
              <h1>{book.title}</h1>
              <p>{book.description || "説明文は未設定です。"}</p>
            </div>
            <Link className="maker-secondary-link" href="/dashboard">マイライブラリへ</Link>
          </div>
          <section className="maker-card management-grid">
            <div>
              <h2>公開状態</h2>
              <dl className="metadata-list">
                <dt>状態</dt><dd>{book.status}</dd>
                <dt>公開範囲</dt><dd>{book.visibility}</dd>
                <dt>公開URL</dt><dd>{book.status === "published" ? <Link href={`/books/${book.slug}`}>/books/{book.slug}</Link> : "未公開"}</dd>
                <dt>更新日時</dt><dd>{new Date(book.updatedAt).toLocaleString("ja-JP")}</dd>
              </dl>
            </div>
            <div className="maker-actions vertical">
              <Link className="maker-primary-link" href={`/dashboard/books/${book.id}/edit`}>編集する</Link>
              <button className="maker-secondary-button" type="button" onClick={() => void setPublication("published", "unlisted")}>限定公開にする</button>
              <button className="maker-secondary-button" type="button" onClick={() => void setPublication("published", "public")}>一般公開にする</button>
              <button className="maker-secondary-button danger" type="button" onClick={() => void setPublication("draft", "private")}>公開停止</button>
            </div>
          </section>
          <section className="maker-card">
            <h2>閲覧解析</h2>
            {analytics ? (
              <div className="analytics-strip expanded" aria-label="閲覧解析">
                <span>閲覧開始 {analytics.views}</span>
                <span>読了 {analytics.completions}</span>
                <span>読了率 {analytics.completionRate}%</span>
                <span>共有 {analytics.shares}</span>
                <span>外部リンク {analytics.externalLinkClicks}</span>
                <span>人気章 {analytics.popularChapters[0]?.title || "未計測"}</span>
              </div>
            ) : (
              <p>まだクラウド解析データはありません。</p>
            )}
          </section>
          {book.status === "published" ? (
            <PromotionCenter
              project={book.bookProject}
              slug={book.slug}
              cloudBookId={book.id}
              locale={book.bookProject.config.language}
            />
          ) : null}
          {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
        </>
      )}
    </main>
  );
}
