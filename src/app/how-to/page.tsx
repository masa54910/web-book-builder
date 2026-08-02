import Link from "next/link";

import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "@/components/ver2/StandalonePage.module.css";

export default function HowToPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>← ホームへ戻る</Link>
        <section className={styles.hero}>
          <p className={styles.kicker}>How To</p>
          <h1 className={styles.title}>かんたん3ステップでWebブックを公開</h1>
          <p className={styles.lead}>文章入力から公開、公開後の分析まで、最短の導線で進められます。</p>
        </section>
        <section className={styles.section}>
          <h2>作成フロー</h2>
          <ol className={styles.list}>
            <li>文章を入力・添付して内容を確認</li>
            <li>表紙・テーマを選んで下書き保存</li>
            <li>公開設定を確認してURLを発行</li>
            <li>公開後に分析で読者の反応を確認</li>
          </ol>
          <div className={styles.actions}>
            <Link href="/#create" className={styles.actionPrimary}>Webブックを作る</Link>
            <Link href="/sample" className={styles.actionSecondary}>サンプルを見る</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
