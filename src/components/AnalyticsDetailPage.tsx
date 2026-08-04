"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import StatusMessage from "@/components/ui/StatusMessage";
import { useAuth } from "@/lib/auth/AuthContext";
import { getBook, type CloudBookRecord } from "@/lib/bookRepository";
import {
  summarizeCloudAnalyticsDetailed,
  type AnalyticsPeriod,
  type CloudAnalyticsDetails,
} from "@/lib/readerAnalytics";

const periods: Array<{ key: AnalyticsPeriod; label: string }> = [
  { key: "7d", label: "7日" },
  { key: "30d", label: "30日" },
  { key: "all", label: "全期間" },
];

function sourceLabel(key: keyof CloudAnalyticsDetails["sources"]) {
  if (key === "x") return "X";
  if (key === "note") return "note";
  if (key === "line") return "LINE";
  if (key === "direct") return "直接流入";
  return "その他";
}

function deviceLabel(key: keyof CloudAnalyticsDetails["devices"]) {
  if (key === "pc") return "PC";
  if (key === "smartphone") return "スマホ";
  if (key === "tablet") return "タブレット";
  return "不明";
}

export default function AnalyticsDetailPage() {
  const params = useParams<{ bookId: string }>();
  const { user } = useAuth();
  const [book, setBook] = useState<CloudBookRecord | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [details, setDetails] = useState<CloudAnalyticsDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || !params.bookId) return;
    getBook(params.bookId, user.id)
      .then((record) => {
        if (!record) {
          setMessage("作品が見つからないか、アクセス権がありません。");
          setBook(null);
          setDetails(null);
          return;
        }
        setBook(record);
        return summarizeCloudAnalyticsDetailed(record.id, period)
          .then((result) => {
            setDetails(result);
            setMessage("");
          })
          .catch((error) => {
            setMessage(error instanceof Error ? error.message : "分析データを取得できませんでした。");
            setDetails(null);
          });
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "作品を読み込めませんでした。");
        setBook(null);
        setDetails(null);
      })
      .finally(() => setIsLoading(false));
  }, [params.bookId, period, user]);

  const maxTrend = useMemo(() => {
    if (!details?.dailyTrend.length) return 1;
    return Math.max(...details.dailyTrend.map((item) => item.views), 1);
  }, [details]);

  return (
    <main className="dashboard-page">
      <AppHeader />
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">Analytics detail</p>
          <HomeBackLink />
          <h1>{book?.title || "作品分析"}</h1>
          <p>
            作品名: {book?.title || "-"} / 公開状態: {book?.status || "-"} / 公開日:
            {book?.firstPublishedAt ? new Date(book.firstPublishedAt).toLocaleDateString("ja-JP") : "未公開"} / 最終更新:
            {book?.updatedAt ? new Date(book.updatedAt).toLocaleString("ja-JP") : "-"}
          </p>
        </div>
        <div className="maker-actions">
          {periods.map((item) => (
            <Button
              key={item.key}
              variant={item.key === period ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setPeriod(item.key);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {message ? <StatusMessage message={message} className="maker-status" /> : null}
      {isLoading ? <LoadingState label="分析データを読み込んでいます…" className="reader-loading" /> : null}

      {!isLoading && details ? (
        <>
          <section className="maker-card analytics-grid">
            <article><h3>閲覧数</h3><p>{details.views}</p></article>
            <article><h3>ユニーク閲覧者数</h3><p>{details.uniqueVisitors}</p></article>
            <article><h3>読了率</h3><p>{details.completionRate}%</p></article>
            <article><h3>平均到達ページ</h3><p>{details.averageReachedPage || 0}</p></article>
            <article><h3>人気ページ</h3><p>{details.popularPages[0] ? `p.${details.popularPages[0].page}` : "0"}</p></article>
            <article><h3>人気章</h3><p>{details.popularChapters[0]?.title || "0"}</p></article>
            <article><h3>離脱ページ</h3><p>{details.dropOffPage || 0}</p></article>
          </section>

          <section className="maker-card">
            <h2>参照元</h2>
            <div className="analytics-strip">
              {Object.entries(details.sources).map(([key, value]) => (
                <span key={key}>{sourceLabel(key as keyof CloudAnalyticsDetails["sources"])} {value}</span>
              ))}
            </div>
          </section>

          <section className="maker-card">
            <h2>デバイス比率</h2>
            <div className="analytics-strip">
              {Object.entries(details.devices).map(([key, value]) => (
                <span key={key}>{deviceLabel(key as keyof CloudAnalyticsDetails["devices"])} {value}</span>
              ))}
            </div>
          </section>

          <section className="maker-card">
            <h2>日別推移</h2>
            {!details.dailyTrend.length ? (
              <p>公開後に閲覧データが表示されます。</p>
            ) : (
              <div className="analytics-trend" aria-label="日別閲覧推移">
                {details.dailyTrend.map((item) => (
                  <div className="analytics-trend-row" key={item.date}>
                    <span>{item.date}</span>
                    <div className="analytics-trend-bar" style={{ width: `${Math.max(6, (item.views / maxTrend) * 100)}%` }} />
                    <strong>{item.views}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="maker-card">
            <h2>人気章</h2>
            {!details.popularChapters.length ? (
              <p>公開後に閲覧データが表示されます。</p>
            ) : (
              <ul className="compact-list">
                {details.popularChapters.map((item) => (
                  <li key={item.title}>{item.title} ({item.views})</li>
                ))}
              </ul>
            )}
          </section>

          <div className="maker-actions" style={{ width: "min(1160px, 100%)", margin: "0 auto" }}>
            <Link className="maker-secondary-link" href="/analytics">作品一覧へ戻る</Link>
            {book ? <Link className="maker-secondary-link" href={`/dashboard/books/${book.id}`}>作品管理へ</Link> : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
