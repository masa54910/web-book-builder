"use client";

import { recordPurchaseLinkClick } from "@/lib/readerAnalytics";

export default function PaywallPage({ slug, amount, currency, paymentUrl, cloudBookId, sellerDisclosure }: { slug: string; amount?: number; currency?: string; paymentUrl?: string; cloudBookId?: string; sellerDisclosure?: { sellerName: string; address: string; supportEmail: string; paymentMethod: string; paymentTiming: string; digitalDeliveryTiming: string; refundPolicy: string; additionalCosts: string; applicationDeadline?: string } }) {
  return <section className="reader-paywall-page" aria-label="有料本文">
    <div className="reader-paywall-lock" aria-hidden="true">🔒</div>
    <h2>ここから有料</h2>
    <p>続きを読むには購入してください。</p>
    {paymentUrl ? <a className="maker-primary-link" href={paymentUrl} target="_blank" rel="noopener noreferrer" onClick={() => recordPurchaseLinkClick(slug, cloudBookId)}>{amount ? `${amount.toLocaleString("ja-JP")} ${currency || "JPY"}で購入する` : "購入する"}</a> : null}
    {sellerDisclosure ? <details className="reader-seller-disclosure"><summary>販売者情報・返品/返金条件を見る</summary><dl><dt>販売者</dt><dd>{sellerDisclosure.sellerName}</dd><dt>所在地</dt><dd>{sellerDisclosure.address}</dd><dt>問い合わせ先</dt><dd>{sellerDisclosure.supportEmail}</dd><dt>支払方法</dt><dd>{sellerDisclosure.paymentMethod}</dd><dt>支払時期</dt><dd>{sellerDisclosure.paymentTiming}</dd><dt>デジタル配信時期</dt><dd>{sellerDisclosure.digitalDeliveryTiming}</dd><dt>返品・返金</dt><dd>{sellerDisclosure.refundPolicy}</dd><dt>追加費用</dt><dd>{sellerDisclosure.additionalCosts}</dd>{sellerDisclosure.applicationDeadline ? <><dt>申込期限</dt><dd>{sellerDisclosure.applicationDeadline}</dd></> : null}</dl></details> : null}
  </section>;
}
