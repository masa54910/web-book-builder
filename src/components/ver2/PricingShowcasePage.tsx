"use client";

import Link from "next/link";

import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "@/components/ver2/PricingShowcasePage.module.css";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";
import LanguageSelector from "@/components/LanguageSelector";

type PricingIconName = "book" | "chart" | "check" | "minus" | "share" | "analytics" | "read" | "external" | "lightbulb" | "tag";

function PricingIcon({ name, size = 24 }: { name: PricingIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "book") {
    return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8M8 11h7" /></svg>;
  }
  if (name === "chart") {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 16v-3M11 16V9M15 16v-5M19 16v-8" /></svg>;
  }
  if (name === "check") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></svg>;
  }
  if (name === "minus") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>;
  }
  if (name === "share") {
    return <svg {...common}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></svg>;
  }
  if (name === "analytics") {
    return <svg {...common}><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></svg>;
  }
  if (name === "read") {
    return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3c2 0 3.7.6 5.5 1.8V20c-1.8-1.2-3.5-1.8-5.5-1.8A2.5 2.5 0 0 0 4 20.7z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3c-2 0-3.7.6-5.5 1.8V20c1.8-1.2 3.5-1.8 5.5-1.8A2.5 2.5 0 0 1 20 20.7z" /></svg>;
  }
  if (name === "external") {
    return <svg {...common}><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" /></svg>;
  }
  if (name === "lightbulb") {
    return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M8.2 14.7A6 6 0 1 1 16 14.5c-.9.8-1.4 1.7-1.6 2.5H9.7c-.2-.9-.7-1.7-1.5-2.3Z" /><path d="M12 2v1.5M4.9 4.9 6 6M19.1 4.9 18 6" /></svg>;
  }
  return <svg {...common}><path d="m9 4 2-2 2 2h4a2 2 0 0 1 2 2v13H5V6a2 2 0 0 1 2-2z" /><path d="M8 9h8M8 13h6" /></svg>;
}

type PlanCard = {
  id: "free" | "publish" | "operationStandard" | "operationPlus";
  badge: string;
  name: string;
  price: string;
  unit: string;
  lead: string;
  features: string[];
  note?: string;
  actionLabel: string;
  href: string;
};

const comparisonRows = [
  { icon: "book" as const, label: "作成・プレビュー", free: "○", publish: "○", standard: "○", plus: "○" },
  { icon: "external" as const, label: "公開枠", free: "—", publish: "1冊分", standard: "1冊分", plus: "10冊分" },
  { icon: "read" as const, label: "公開後の編集", free: "—", publish: "継続編集可能", standard: "継続編集可能", plus: "継続編集可能" },
  { icon: "book" as const, label: "WebBook Gallery掲載", free: "—", publish: "○", standard: "○", plus: "○" },
  { icon: "share" as const, label: "SNS共有（X・note・LINEなど）", free: "—", publish: "○", standard: "○", plus: "○" },
  { icon: "share" as const, label: "URL / QR共有", free: "—", publish: "○", standard: "○", plus: "○" },
  { icon: "analytics" as const, label: "アクセス解析ができる", free: "—", publish: "—", standard: "○", plus: "○" },
  { icon: "read" as const, label: "読者の行動分析ができる", free: "—", publish: "—", standard: "○", plus: "○" },
  { icon: "external" as const, label: "作品販売", free: "—", publish: "—", standard: "○", plus: "○" },
];

export default function PricingShowcasePage() {
  const { user } = useAuth();
  const { locale } = useUiLocale();
  const startHref = user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew";
  const plans: PlanCard[] = [
    {
      id: "free",
      badge: "FREE",
      name: uiT(locale, "pricing.freePlan"),
      price: "¥0",
      unit: "",
      lead: "まずは無料で、Webブックを作って試せます。",
      features: ["ご自身の閲覧用", "作成・プレビュー", "表紙・ページ調整", "公開前の仕上がりを確認", "一般公開はできません"],
      actionLabel: uiT(locale, "pricing.startFree"),
      href: startHref,
      note: "クレジットカード登録不要",
    },
    {
      id: "publish",
      badge: "PUBLISH",
      name: uiT(locale, "pricing.publicationPlan"),
      price: "¥980",
      unit: "／1冊分",
      lead: "まずは1冊を、Webで公開。",
      features: ["1冊分の公開枠", "公開後も継続編集可能", "WebBook Galleryに掲載", "X・note・LINEなどへ共有", "作品販売機能は含まない"],
      actionLabel: uiT(locale, "pricing.startPublication"),
      href: "/signup?plan=publish",
      note: "買い切り・Stripe Checkout",
    },
    {
      id: "operationStandard",
      badge: "STANDARD",
      name: uiT(locale, "pricing.operationStandardPlan"),
      price: "¥980",
      unit: "／月",
      lead: "1冊を公開し、販売しながら育てる方へ。",
      features: ["1冊分の公開枠", "公開後も継続編集可能", "アクセス分析ができる", "作品販売機能あり", "公開後の運用に対応"],
      actionLabel: uiT(locale, "pricing.startOperationStandard"),
      href: "/signup?plan=operation_standard",
      note: "月額・いつでも解約可能",
    },
    {
      id: "operationPlus",
      badge: "PLUS",
      name: uiT(locale, "pricing.operationPlusPlan"),
      price: "¥1,980",
      unit: "／月",
      lead: "複数冊を、販売しながら育てる。",
      features: ["10冊分の公開枠", "公開後もいつでも編集可能", "アクセス分析ができる", "読者の行動分析ができる", "作品販売機能あり", "過去の出版済み作品も再編集可能"],
      actionLabel: uiT(locale, "pricing.startOperationPlus"),
      href: "/signup?plan=operation_plus",
      note: "月額・いつでも解約可能",
    },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <HomeBackLink label={uiT(locale, "common.backHome")} />
          <LanguageSelector />
        </div>

        <section className={styles.hero} aria-labelledby="pricing-heading">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>WebBooK<span className={styles.brandMaker}>Maker</span></p>
            <h1 id="pricing-heading">{uiT(locale, "pricing.title")}</h1>
            <p className={styles.heroLead}>{uiT(locale, "pricing.lead")}</p>
            <p className={styles.heroSub}>{locale === "en" ? "Publish one book with Publication, or keep selling and improving it with Operation." : "1冊分だけ公開するなら「出版プラン」または「運用スタンダード」。複数冊を販売しながら育てるなら「運用プラス」。"}</p>
          </div>
        </section>

        <section className={styles.cards} aria-label={locale === "en" ? "Pricing plans" : "料金プラン一覧"}>
          {plans.map((plan) => (
            <article key={plan.id} className={`${styles.card} ${styles[`card${plan.id[0].toUpperCase()}${plan.id.slice(1)}`]}`}>
                {plan.id === "operationPlus" ? <span className={styles.dealRibbon}>お得！</span> : null}
              <span className={styles.badge}>{plan.badge}</span>
              <h2 className={plan.id === "operationStandard" || plan.id === "operationPlus" ? styles.planTitleTwoLine : undefined}>
                {plan.id === "operationStandard" || plan.id === "operationPlus"
                  ? plan.name.split(" ").map((part) => <span key={part}>{part}</span>)
                  : plan.name}
              </h2>
              <p className={styles.price}><strong>{plan.price}</strong> <small>{plan.unit}</small></p>
              <p className={styles.planLead}>{plan.lead}</p>
              <ul className={styles.featureList}>
                {plan.features.map((feature, index) => (
                  <li key={feature} className={index === plan.features.length - 1 && plan.id === "free" ? styles.featureMuted : undefined}>
                    <PricingIcon name={index === plan.features.length - 1 && plan.id === "free" ? "minus" : "check"} size={15} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.cardActions}>
                <Link className={`maker-primary-link ${styles.planAction}`} href={plan.href}>{plan.actionLabel}</Link>
                {plan.id === "publish" ? <p className={styles.planTag}><PricingIcon name="tag" size={16} /><span>{plan.note}</span></p> : <small className={styles.planNote}>{plan.note}</small>}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.compare} aria-labelledby="pricing-compare-heading">
          <h2 id="pricing-compare-heading">{uiT(locale, "pricing.compare")}</h2>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th scope="col">機能</th><th scope="col">無料プラン</th><th scope="col">出版プラン</th><th scope="col">運用スタンダード</th><th scope="col">運用プラス</th></tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row"><PricingIcon name={row.icon} size={19} /><span>{row.label}</span></th>
                    <td>{row.free}</td><td>{row.publish}</td><td>{row.standard}</td><td>{row.plus}</td>
                  </tr>
                ))}
                <tr className={styles.priceRow}>
                  <th scope="row"><PricingIcon name="tag" size={19} /><span>料金</span></th>
                  <td>¥0</td><td>¥980 / 1冊分（買い切り）</td><td>¥980 / 月</td><td>¥1,980 / 月</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.guide} aria-labelledby="plan-guide-heading">
          <PricingIcon name="lightbulb" size={42} />
          <div>
            <h2 id="plan-guide-heading">どのプランが合っている？</h2>
            <p>まずは作って試したい方は「無料プラン」。1冊分を公開したい方は「出版プラン」または「運用スタンダード」。<br />複数冊を販売しながら育てていきたい方は「運用プラス」がおすすめです。</p>
          </div>
          <Link className={`maker-secondary-link ${styles.guideAction}`} href="/use-cases">
            詳しい活用例はこちら<span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
