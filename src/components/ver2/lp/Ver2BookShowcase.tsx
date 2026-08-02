import styles from "./Ver2Landing.module.css";

export default function Ver2BookShowcase() {
  return (
    <div className={styles.bookShowcase} aria-label="Webブック完成イメージ（仮）">
      <div className={styles.bookStage}>
        <div className={styles.bookShadow} />
        <div className={styles.openBook}>
          <div className={styles.bookPage}>
            <span className={styles.bookKicker}>Webブック サンプル</span>
            <h3>星降る街の<br />小さな記録</h3>
            <p>書いた文章が、本のようにページをめくって読めるWebブックになります。</p>
            <span className={styles.pageNumber}>12</span>
          </div>
          <div className={styles.bookGutter} />
          <div className={`${styles.bookPage} ${styles.bookRightPage}`}>
            <div className={styles.bookVisual}><span className={styles.bookMoon} /><span className={styles.bookTown} /></div>
            <p style={{ marginTop: "10px", textAlign: "center", fontSize: "10.5px" }}>星明かりに包まれた静かな街。</p>
            <span className={styles.pageNumber}>13</span>
          </div>
        </div>
        <div className={styles.featureBadges}><span><i>✓</i> 公開URL</span><span><i>✓</i> X共有</span><span><i>✓</i> note記事</span><span><i>✓</i> 紹介動画</span></div>
        <div className={styles.tempLabel}>完成版Webブックに差し替え予定</div>
      </div>
    </div>
  );
}
