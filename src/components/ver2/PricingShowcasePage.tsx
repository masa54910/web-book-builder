"use client";

import Link from "next/link";

import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "@/components/ver2/PricingShowcasePage.module.css";

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
  id: "free" | "publish" | "operation";
  badge: string;
  name: string;
  price: string;
  unit: string;
  lead: string;
  features: string[];
  note?: string;
  paymentNote?: string;
  actionLabel: string;
  href: string;
};

const comparisonRows = [
  { icon: "book" as const, label: "作成・プレビュー", free: "○", publish: "○", operation: "○" },
  { icon: "external" as const, label: "公開", free: "—", publish: "1作品", operation: "月10作品まで" },
  { icon: "read" as const, label: "公開後の編集", free: "—", publish: "7日間まで", operation: "いつでも可能" },
  { icon: "book" as const, label: "WebBook Gallery掲載", free: "—", publish: "○", operation: "○" },
  { icon: "share" as const, label: "SNS共有（X・note・LINEなど）", free: "—", publish: "○", operation: "○" },
  { icon: "analytics" as const, label: "アクセス分析", free: "—", publish: "○（基本）", operation: "○（詳細）" },
  { icon: "read" as const, label: "読者の行動（読了・閲覧ページなど）", free: "—", publish: "△（一部）", operation: "○（すべて）" },
  { icon: "external" as const, label: "外部リンク・CTA設置", free: "—", publish: "○", operation: "○（分析付き）" },
];

export default function PricingShowcasePage() {
  const { user } = useAuth();
  const startHref = user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew";
  const plans: PlanCard[] = [
    {
      id: "free",
      badge: "FREE",
      name: "無料プラン",
      price: "¥0",
      unit: "/ 月",
      lead: "まずは無料で、Webブックを作って試せます。",
      features: ["ご自身の閲覧用", "作成・プレビュー", "表紙・ページ調整", "公開前の仕上がりを確認", "一般公開はできません"],
      actionLabel: "無料ではじめる",
      href: startHref,
      note: "クレジットカード登録不要",
    },
    {
      id: "publish",
      badge: "PUBLISH",
      name: "出版プラン",
      price: "¥980",
      unit: "/ 1作品",
      lead: "完成した作品を、Webで公開したい方へ。",
      features: ["1作品を公開", "公開後7日間は編集可能", "WebBook Galleryに掲載", "X・note・LINEなどへ共有", "公開URLはそのまま継続"],
      actionLabel: "出版プランではじめる",
      href: "/signup?plan=publish",
      note: "買い切り・月額料金なし",
      paymentNote: "PayPay払いO.K！",
    },
    {
      id: "operation",
      badge: "OPERATION",
      name: "運用プラン",
      price: "¥1,980",
      unit: "/ 月",
      lead: "公開後も、編集・分析しながら作品を育てたい方へ。",
      features: ["月10作品まで公開", "公開後もいつでも編集可能", "アクセス分析ができる", "読者がどのページまで読んだか分かる", "過去の出版済み作品も再編集可能"],
      actionLabel: "運用プランではじめる",
      href: "/signup?plan=writer",
      note: "いつでも解約できます",
    },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <HomeBackLink label="ホームへ戻る" />
        </div>

        <section className={styles.hero} aria-labelledby="pricing-heading">
          <PricingIcon name="book" size={56} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>WebBooK<span className={styles.brandMaker}>Maker</span></p>
            <h1 id="pricing-heading">料金プラン</h1>
            <p className={styles.heroLead}>作るところまでは無料。公開スタイルに合わせて選べます。</p>
            <p className={styles.heroSub}>1作品だけ公開するなら「出版プラン」。公開後も編集・分析しながら育てるなら「運用プラン」。</p>
          </div>
          <PricingIcon name="chart" size={56} />
        </section>

        <section className={styles.cards} aria-label="料金プラン一覧">
          {plans.map((plan) => (
            <article key={plan.id} className={`${styles.card} ${styles[`card${plan.id[0].toUpperCase()}${plan.id.slice(1)}`]}`}>
              {plan.id === "operation" ? <span className={styles.dealRibbon}>お得！</span> : null}
              <span className={styles.badge}>{plan.badge}</span>
              <h2>{plan.name}</h2>
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
                {plan.id === "publish" ? <p className={styles.planTag}><PricingIcon name="tag" size={16} /><span>{plan.note}</span><span className={styles.paymentNote}>{plan.paymentNote}</span></p> : <small className={styles.planNote}>{plan.note}</small>}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.compare} aria-labelledby="pricing-compare-heading">
          <h2 id="pricing-compare-heading">プラン比較表</h2>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th scope="col">機能</th><th scope="col">無料プラン</th><th scope="col">出版プラン</th><th scope="col">運用プラン</th></tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row"><PricingIcon name={row.icon} size={19} /><span>{row.label}</span></th>
                    <td>{row.free}</td><td>{row.publish}</td><td>{row.operation}</td>
                  </tr>
                ))}
                <tr className={styles.priceRow}>
                  <th scope="row"><PricingIcon name="tag" size={19} /><span>料金</span></th>
                  <td>¥0 / 月</td><td>¥980 / 1作品（買い切り）</td><td>¥1,980 / 月</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.guide} aria-labelledby="plan-guide-heading">
          <PricingIcon name="lightbulb" size={42} />
          <div>
            <h2 id="plan-guide-heading">どのプランが合っている？</h2>
            <p>1作品だけ公開したい方は「出版プラン」。<br />日々の情報発信や複数の作品を育てていきたい方は「運用プラン」がおすすめです。</p>
          </div>
          <Link href="/help" className={styles.guideAction}>詳しく見る <span aria-hidden="true">›</span></Link>
        </section>
      </div>
    </main>
  );
}
