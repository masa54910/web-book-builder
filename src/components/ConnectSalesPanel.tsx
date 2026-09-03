"use client";

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
};

type LegalTerms = {
  paymentMethod: string;
  paymentTiming: string;
  digitalDeliveryTiming: string;
  refundPolicy: string;
  additionalCosts: string;
  applicationDeadline: string;
};

/** Creates or reuses the seller's Connect Payment Link for this book. */
export default function ConnectSalesPanel({ bookId, hasPaywall }: ConnectSalesPanelProps) {
  const { user, authMode } = useAuth();
  const [amount, setAmount] = useState("500");
  const [currency, setCurrency] = useState("jpy");
  const [legalTerms, setLegalTerms] = useState<LegalTerms>({
    paymentMethod: "",
    paymentTiming: "",
    digitalDeliveryTiming: "",
    refundPolicy: "",
    additionalCosts: "",
    applicationDeadline: "",
  });
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
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
      const result = await response.json().catch(() => ({})) as { sale?: { amount?: number; currency?: string; legalTerms?: Partial<LegalTerms> } | null };
      if (!active || !result.sale) return;
      if (typeof result.sale.amount === "number") setAmount(String(result.sale.amount));
      if (typeof result.sale.currency === "string") setCurrency(result.sale.currency.toLowerCase());
      if (result.sale.legalTerms) setLegalTerms((current) => ({ ...current, ...result.sale?.legalTerms }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [bookId]);

  if (!bookId || !hasPaywall || !user || authMode !== "supabase") return null;

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
        body: JSON.stringify({ bookId, amount: Number(amount), currency, legalTerms }),
      });
      const result = (await response.json().catch(() => ({}))) as SalesResult;
      if (!response.ok) throw new Error(result.error || "販売リンクを作成できませんでした。");
      setPaymentLinkUrl(result.paymentLinkUrl || "");
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
      <div className="maker-grid">
        <label>
          <span>価格（最小単位）</span>
          <input inputMode="numeric" min={1} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label>
          <span>通貨</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option value="jpy">JPY</option>
          </select>
        </label>
      </div>
      <div className="maker-grid">
        <label><span>支払方法</span><input value={legalTerms.paymentMethod} onChange={(event) => setLegalTerms((current) => ({ ...current, paymentMethod: event.target.value }))} placeholder="Stripe Payment Link（カード等）" /></label>
        <label><span>支払時期</span><input value={legalTerms.paymentTiming} onChange={(event) => setLegalTerms((current) => ({ ...current, paymentTiming: event.target.value }))} placeholder="注文時に決済" /></label>
        <label><span>デジタル配信時期</span><input value={legalTerms.digitalDeliveryTiming} onChange={(event) => setLegalTerms((current) => ({ ...current, digitalDeliveryTiming: event.target.value }))} placeholder="決済確認後すぐに閲覧可能" /></label>
        <label><span>返品・返金条件</span><textarea rows={2} value={legalTerms.refundPolicy} onChange={(event) => setLegalTerms((current) => ({ ...current, refundPolicy: event.target.value }))} placeholder="返品・返金の条件を記載" /></label>
        <label><span>追加費用</span><input value={legalTerms.additionalCosts} onChange={(event) => setLegalTerms((current) => ({ ...current, additionalCosts: event.target.value }))} placeholder="追加料金なし" /></label>
        <label><span>申込期限（任意）</span><input value={legalTerms.applicationDeadline} onChange={(event) => setLegalTerms((current) => ({ ...current, applicationDeadline: event.target.value }))} /></label>
      </div>
      <div className="maker-actions">
        <Button loading={saving} onClick={() => void createPaymentLink()}>販売リンクを用意</Button>
        {paymentLinkUrl ? <a className="maker-secondary-link" href={paymentLinkUrl} target="_blank" rel="noopener noreferrer">販売リンクを確認</a> : null}
      </div>
      {error ? <StatusMessage variant="error" message={error} className="form-error" /> : null}
      {message ? <StatusMessage variant="success" message={message} className="maker-status" /> : null}
    </section>
  );
}
