"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type VerificationState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; accessCode: string; bookSlug: string };

export default function PurchaseSuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  const verify = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/purchases/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ session_id: sessionId }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; access_code?: string; book_slug?: string };
      if (!response.ok || !result.success || !result.access_code || !result.book_slug) {
        throw new Error(result.message || "お支払いを確認できませんでした。");
      }
      setState({ status: "success", accessCode: result.access_code, bookSlug: result.book_slug });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "お支払いを確認できませんでした。" });
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void verify(), 0);
    return () => window.clearTimeout(timer);
  }, [verify]);

  const copyCode = async () => {
    if (state.status !== "success") return;
    try {
      await navigator.clipboard.writeText(state.accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="purchase-page">
      <section className="purchase-card" aria-live="polite">
        {state.status === "loading" && <p className="purchase-status">お支払いを確認しています…</p>}
        {state.status === "error" && (
          <div className="purchase-content">
            <h1>お支払いを確認できませんでした</h1>
            <p>{state.message}</p>
            <button type="button" className="purchase-button purchase-button-primary" onClick={() => void verify()}>もう一度確認する</button>
          </div>
        )}
        {state.status === "success" && (
          <div className="purchase-content">
            <p className="purchase-kicker">WebBookMaker</p>
            <h1>購入ありがとうございます</h1>
            <p>お支払いを確認しました。閲覧コードを発行しました。</p>
            <div className="purchase-code-block">
              <span>閲覧コード</span>
              <strong>{state.accessCode}</strong>
              <button type="button" className="purchase-button purchase-button-secondary" onClick={() => void copyCode()} aria-label="閲覧コードをコピー">{copied ? "コピーしました" : "コードをコピー"}</button>
            </div>
            <p className="purchase-note">このコードはWebブック閲覧時に使用します。</p>
            <Link className="purchase-button purchase-button-primary" href={`/books/${encodeURIComponent(state.bookSlug)}`}>Webブックへ戻る</Link>
          </div>
        )}
      </section>
    </main>
  );
}
