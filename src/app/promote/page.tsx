import Link from "next/link";

import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "@/components/ver2/StandalonePage.module.css";

export default function PromotePage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>← ホームへ戻る</Link>
        <section className={styles.hero}>
          <p className={styles.kicker}>Promote</p>
          <h1 className={styles.title}>作品を広める</h1>
          <p className={styles.lead}>公開した作品をX・note・LINE・作者ページ導線で読者へ届けるための機能です。</p>
        </section>
        <section className={styles.section}>
          <h2>共有チャネル</h2>
          <ul className={styles.list}>
            <li>X共有: 投稿文と公開URLを生成</li>
            <li>note記事作成: 見出し付きテンプレートを生成</li>
            <li>LINE共有: 共有URLを生成</li>
            <li>URLコピー: クリップボードへコピー</li>
            <li>紹介動画: 現在は準備中導線</li>
            <li>作者ページ: 公開作品のまとめ導線</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.actionPrimary}>ダッシュボードで共有する</Link>
            <Link href="/sample" className={styles.actionSecondary}>公開サンプルを見る</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
