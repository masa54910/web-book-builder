import styles from "./Ver2Landing.module.css";

export default function Ver2Pricing() {
  return (
    <section className={styles.pricingSection}>
      <div className={styles.container}>
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}><span>20</span><strong>ページまで無料</strong><small>まずはお試しできます</small></div>
          <div className={styles.trustItem}><span>0</span><strong>カード登録不要</strong><small>気軽に始められます</small></div>
          <div className={styles.trustItem}><span>✓</span><strong>公開前に確認</strong><small>見た目を確認してから公開</small></div>
          <div className={styles.trustItem}><span>↻</span><strong>いつでも編集</strong><small>公開後も同じURLで更新</small></div>
        </div>
      </div>
    </section>
  );
}
