import styles from "./Ver2Landing.module.css";

export default function Ver2Faq() {
  return (
    <section className={`${styles.section} ${styles.faqSection}`} id="faq">
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>よくある質問</h2>
        <p className={styles.sectionLead}>初めての方が気になるポイントを、短くわかりやすくまとめました。</p>
        <div className={styles.faqGrid}>
          <details className={styles.faqItem}><summary>パソコンが苦手でも使えますか？</summary><p>はい。文章を貼り付け、表紙とテーマを選ぶだけで作成できます。難しい設定はありません。</p></details>
          <details className={styles.faqItem}><summary>PDFを作る必要はありますか？</summary><p>必要ありません。文章を直接貼り付けるだけでWebブックにできます。PDF・Word・Markdown・TXTの読み込みも可能です。</p></details>
          <details className={styles.faqItem}><summary>入力途中で保存できますか？</summary><p>はい。自動保存に対応し、あとから続きの編集ができます。</p></details>
          <details className={styles.faqItem}><summary>公開後に修正できますか？</summary><p>はい。同じ公開URLのまま、本文・表紙・テーマを更新できます。</p></details>
          <details className={styles.faqItem}><summary>スマートフォンでも読めますか？</summary><p>はい。パソコン、タブレット、スマートフォンに合わせて読みやすく表示します。</p></details>
          <details className={styles.faqItem}><summary>無料でどこまで使えますか？</summary><p>20ページまで無料で作成・公開できます。作家プランはいつでも解約できます。</p></details>
        </div>
      </div>
    </section>
  );
}
