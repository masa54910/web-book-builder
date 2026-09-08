"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import StatusMessage from "@/components/ui/StatusMessage";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

type ConnectSalesPanelProps = {
  bookId?: string;
  hasPaywall: boolean;
};

type SalesResult = {
  paymentLinkUrl?: string;
  reused?: boolean;
  error?: string;
  canCreateSale?: boolean;
  stripeConnected?: boolean;
  sale?: { amount?: number; currency?: string; paymentLinkUrl?: string | null } | null;
};

/** Creates or reuses the seller's Connect Payment Link for this book. */
export default function ConnectSalesPanel({ bookId, hasPaywall }: ConnectSalesPanelProps) {
  const { user, authMode } = useAuth();
  const [amount, setAmount] = useState("500");
  const [currency, setCurrency] = useState("jpy");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
  const [canCreateSale, setCanCreateSale] = useState(false);
  const [hasExistingSale, setHasExistingSale] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!bookId) return () => { active = false; };
    const client = getSupabaseClient();
    if (!client) return () => { active = false; };
    void client.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token || !active) return;
      const response = await fetch(`/api/connect/sales?bookId=${encodeURIComponent(bookId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok || !active) return;
      const result = await response.json().catch(() => ({})) as SalesResult;
      if (!active) return;
      setCanCreateSale(result.canCreateSale === true);
      setStripeConnected(result.stripeConnected === true);
      setHasExistingSale(Boolean(result.sale));
      if (!result.sale) return;
      if (typeof result.sale.amount === "number") setAmount(String(result.sale.amount));
      if (typeof result.sale.currency === "string" && (result.sale.currency === "jpy" || result.sale.currency === "usd")) setCurrency(result.sale.currency);
      if (result.sale.paymentLinkUrl) setPaymentLinkUrl(result.sale.paymentLinkUrl);
    }).catch(() => undefined).finally(() => { if (active) setEligibilityLoaded(true); });
    return () => { active = false; };
  }, [bookId]);

  if (!bookId || !hasPaywall || !user || authMode !== "supabase") return null;
  if (!eligibilityLoaded) {
    return <section className="maker-card connect-sales-panel" aria-labelledby="connect-sales-heading"><h2 id="connect-sales-heading">作品販売</h2><p className="maker-note">販売設定を確認しています…</p></section>;
  }
  if (eligibilityLoaded && !canCreateSale && !hasExistingSale) {
    return <section className="maker-card connect-sales-panel" aria-labelledby="connect-sales-heading"><h2 id="connect-sales-heading">作品販売</h2><p className="maker-note">新しい作品販売には運用プランが必要です。</p><Link className="maker-secondary-link" href="/pricing">料金プランを確認</Link></section>;
  }

  const createPaymentLink = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const client = getSupabaseClient();
      const sessionResult = client ? await client.auth.getSession() : { data: { session: null } };
      const token = sessionResult.data.session?.access_token;
      if (!token) throw new Error("ログイン状態を確認できません。再ログインしてください。");

      const response = await fetch("/api/connect/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookId, amount: Number(amount), currency }),
      });
      const result = (await response.json().catch(() => ({}))) as SalesResult;
      if (!response.ok) throw new Error(result.error || "販売リンクを作成できませんでした。");
      setPaymentLinkUrl(result.paymentLinkUrl || "");
      setHasExistingSale(true);
      setCanCreateSale(true);
      setMessage(result.reused ? "既存の販売リンクを再利用しました。" : "販売リンクを作成しました。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "販売リンクを作成できませんでした。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="maker-card connect-sales-panel" aria-labelledby="connect-sales-heading">
      <h2 id="connect-sales-heading">この作品を販売</h2>
      <p className="maker-note">Paywall以降を購入者へ届ける販売リンクを、接続済みStripeアカウントで用意します。</p>
      <p className="maker-note">Stripe接続状況：{stripeConnected ? "接続済み" : "未接続"}（変更は<Link href="/settings">Stripe設定</Link>から）</p>
      {stripeConnected ? <div className="maker-grid">
        <label>
          <span>価格</span>
          <input inputMode="numeric" min={1} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label>
          <span>通貨</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option value="jpy">JPY</option>
            <option value="usd">USD</option>
          </select>
        </label>
      </div> : null}
      {paymentLinkUrl ? <p className="maker-note">Payment Link：<a href={paymentLinkUrl} target="_blank" rel="noopener noreferrer">Stripeで販売リンクを確認</a></p> : null}
      <p className="maker-note">販売者情報とStripe接続は<Link href="/settings">設定</Link>で管理します。</p>
      <div className="maker-actions">
        {stripeConnected ? <Button loading={saving} onClick={() => void createPaymentLink()}>販売リンクを用意</Button> : <Link className="maker-secondary-link" href="/settings">Stripe設定へ</Link>}
        {paymentLinkUrl ? <a className="maker-secondary-link" href={paymentLinkUrl} target="_blank" rel="noopener noreferrer">販売リンクを確認</a> : null}
      </div>
      {error ? <StatusMessage variant="error" message={error} className="form-error" /> : null}
      {message ? <StatusMessage variant="success" message={message} className="maker-status" /> : null}
    </section>
  );
}
