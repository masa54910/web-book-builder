"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type VerificationState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; bookSlug: string };

export default function PurchaseSuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState<VerificationState>({ status: "loading" });

  const verify = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/purchases/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ session_id: sessionId }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; book_slug?: string };
      if (!response.ok || !result.success || !result.book_slug) {
        throw new Error(result.message || "お支払いを確認できませんでした。");
      }
      setState({ status: "success", bookSlug: result.book_slug });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "お支払いを確認できませんでした。" });
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void verify(), 0);
    return () => window.clearTimeout(timer);
  }, [verify]);

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
            <p>お支払いを確認しました。このWebブックの続きを読むことができます。</p>
            <Link className="purchase-button purchase-button-primary" href={`/books/${encodeURIComponent(state.bookSlug)}`}>Webブックへ戻る</Link>
          </div>
        )}
      </section>
    </main>
  );
}
