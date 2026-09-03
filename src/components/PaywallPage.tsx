"use client";

import { recordPurchaseLinkClick } from "@/lib/readerAnalytics";

export default function PaywallPage({ slug, amount, currency, paymentUrl, cloudBookId }: { slug: string; amount?: number; currency?: string; paymentUrl?: string; cloudBookId?: string }) {
  return <section className="reader-paywall-page" aria-label="有料本文">
    <div className="reader-paywall-lock" aria-hidden="true">🔒</div>
    <h2>ここから有料</h2>
    <p>続きを読むには購入してください。</p>
    {paymentUrl ? <a className="maker-primary-link" href={paymentUrl} target="_blank" rel="noopener noreferrer" onClick={() => recordPurchaseLinkClick(slug, cloudBookId)}>{amount ? `${amount.toLocaleString("ja-JP")} ${currency || "JPY"}で購入する` : "購入する"}</a> : null}
  </section>;
}
