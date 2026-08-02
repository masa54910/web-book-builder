import Link from "next/link";

import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "@/components/ver2/StandalonePage.module.css";

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>← ホームへ戻る</Link>
        <section className={styles.hero}>
          <p className={styles.kicker}>Pricing</p>
          <h1 className={styles.title}>料金プラン</h1>
          <p className={styles.lead}>無料枠は20ページまで。ベータ期間中の決済提供状況を明確に表示します。</p>
        </section>
        <section className={styles.section}>
          <h2>ベータ期間の提供範囲</h2>
          <ul className={styles.list}>
            <li>無料プラン: 20ページまで作成・公開</li>
            <li>出版プラン: 980円/1冊（準備中）</li>
            <li>作家プラン: 1,980円/月（準備中）</li>
            <li>現在は決済を有効化しておらず、課金は発生しません</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/#create" className={styles.actionPrimary}>無料で作成を始める</Link>
            <Link href="/contact" className={styles.actionSecondary}>提供開始の案内を受け取る</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
