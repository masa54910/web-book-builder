import Link from "next/link";

import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "@/components/ver2/StandalonePage.module.css";

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>← ホームへ戻る</Link>
        <section className={styles.hero}>
          <p className={styles.kicker}>FAQ</p>
          <h1 className={styles.title}>よくある質問</h1>
          <p className={styles.lead}>初めて利用する方が迷いやすいポイントを整理しています。</p>
        </section>
        <section className={styles.section}>
          <h2>主な質問</h2>
          <ul className={styles.list}>
            <li>パソコンが苦手でも使えますか？</li>
            <li>PDFを作る必要はありますか？</li>
            <li>入力途中で保存できますか？</li>
            <li>公開後に修正できますか？</li>
            <li>スマートフォンでも読めますか？</li>
            <li>無料でどこまで使えますか？</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/contact" className={styles.actionPrimary}>解決しない場合は問い合わせる</Link>
            <Link href="/guidelines" className={styles.actionSecondary}>投稿ガイドラインを見る</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
