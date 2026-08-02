import styles from "./Ver2Landing.module.css";

export default function Ver2FeatureStrip() {
  return (
    <div className={`${styles.container} ${styles.featureStripWrap}`}>
      <div className={styles.inputMessageCard}>
        <div className={styles.inputMessageIcon}>✦</div>
        <div>
          <h2>PDFや専用ファイルを作らなくても大丈夫。</h2>
          <p>文章を直接貼り付けるだけで始められます。既存原稿がある場合は、PDF・Word・Markdown・TXTの読み込みにも対応します。</p>
        </div>
      </div>
    </div>
  );
}
