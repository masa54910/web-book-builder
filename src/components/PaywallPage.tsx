"use client";

import { useState } from "react";

export default function PaywallPage({ slug, amount, currency, paymentUrl }: { slug: string; amount?: number; currency?: string; paymentUrl?: string }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async () => {
    setIsSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/purchases/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, accessCode: code }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "閲覧コードを確認できませんでした。");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "閲覧コードを確認できませんでした。"); }
    finally { setIsSubmitting(false); }
  };
  return <section className="reader-paywall-page" aria-label="有料本文">
    <div className="reader-paywall-lock" aria-hidden="true">🔒</div>
    <h2>ここから有料</h2>
    <p>続きを読むには、購入後に表示される閲覧コードを入力してください。</p>
    {paymentUrl ? <a className="maker-primary-link" href={paymentUrl} target="_blank" rel="noopener noreferrer">{amount ? `${amount.toLocaleString("ja-JP")} ${currency || "JPY"}で購入する` : "閲覧コードを購入する"}</a> : null}
    <label className="reader-paywall-code"><span>閲覧コード</span><input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" /></label>
    <button type="button" className="maker-secondary-button" disabled={isSubmitting || !code.trim()} onClick={() => void submit()}>コードで続きを読む</button>
    {message ? <p role="alert" className="form-error">{message}</p> : null}
  </section>;
}
