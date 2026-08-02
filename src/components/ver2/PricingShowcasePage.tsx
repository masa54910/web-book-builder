"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import styles from "@/components/ver2/PricingShowcasePage.module.css";
import HomeBackLink from "@/components/HomeBackLink";

const compareRows = [
  { label: "作成可能ページ", free: "20ページまで", publish: "1冊ごとに無制限", writer: "無制限" },
  { label: "公開URL", free: "利用可", publish: "利用可", writer: "利用可" },
  { label: "共有素材", free: "基本", publish: "拡張", writer: "拡張 + 分析" },
  { label: "紹介動画", free: "-", publish: "準備中", writer: "準備中" },
  { label: "分析レポート", free: "-", publish: "簡易", writer: "詳細" },
];

export default function PricingShowcasePage() {
  const { user } = useAuth();
  const startHref = user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <HomeBackLink />
        </div>

        <section className={styles.hero}>
          <p className={styles.kicker}>Pricing</p>
          <h1>料金プラン</h1>
          <p>まずは20ページまで無料。必要になったらPlusへ切り替えられます。</p>
        </section>

        <section className={styles.cards}>
          <article className={`${styles.card} ${styles.cardFree}`}>
            <span className={styles.badge}>Free</span>
            <h2>無料プラン</h2>
            <p className={styles.price}>¥0 <small>/ 月</small></p>
            <p className={styles.planLead}>まずは気軽に、無料で20ページまで公開できます。</p>
            <ul className={styles.featureList}>
              <li>20ページまで</li>
              <li>作品作成・公開</li>
              <li>基本共有機能</li>
            </ul>
            <div className={styles.cardActions}>
              <Link className={`maker-primary-link ${styles.planAction}`} href={startHref}>無料ではじめる</Link>
            </div>
          </article>

          <article className={`${styles.card} ${styles.cardPublish}`}>
            <span className={styles.badge}>Publish</span>
            <h2>出版プラン</h2>
            <p className={styles.price}>¥980 <small>/ 1作品</small></p>
            <p className={styles.planLead}>買い切りで1作品をしっかり仕上げる出版向けプランです。</p>
            <ul className={styles.featureList}>
              <li>作品ごと買い切り</li>
              <li>公開導線の最適化</li>
              <li>共有テンプレート拡張</li>
            </ul>
            <div className={styles.cardActions}>
              <Link className={`maker-secondary-link ${styles.planAction} ${styles.publishAction}`} href="/signup?plan=publish">出版プランではじめる</Link>
            </div>
          </article>

          <article className={`${styles.card} ${styles.cardWriter}`}>
            <span className={styles.badge}>Writer</span>
            <h2>作家プラン</h2>
            <p className={styles.price}>¥1,980 <small>/ 月</small></p>
            <p className={styles.planLead}>連載や複数作品を継続運用する方向けの上位プランです。</p>
            <ul className={styles.featureList}>
              <li>ページ数制限なし</li>
              <li>作者ページ運用</li>
              <li>作品ごとのアクセス分析</li>
            </ul>
            <div className={styles.cardActions}>
              <Link className={`maker-secondary-link ${styles.planAction} ${styles.writerAction}`} href="/signup?plan=writer">作家プランではじめる</Link>
            </div>
          </article>
        </section>

        <section className={styles.compare}>
          <h2>プラン比較表</h2>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>機能</th>
                  <th>無料</th>
                  <th>出版</th>
                  <th>作家</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.free}</td>
                    <td>{row.publish}</td>
                    <td>{row.writer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.cta}>
          <h2>まずは無料ではじめてみましょう</h2>
          <p>登録後すぐに、下書きの続きから作品を作成できます。</p>
          <div className={styles.ctaActions}>
            <Link className="maker-primary-link" href={startHref}>無料ではじめる</Link>
            <HomeBackLink />
          </div>
        </section>
      </div>
    </main>
  );
}
