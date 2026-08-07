import styles from "./Ver2Landing.module.css";

export default function Ver2Pricing() {
  return (
    <section className={styles.pricingSection}>
      <div className={styles.container}>
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <span>20</span>
            <div className={styles.trustText}>
              <strong>ページまで無料</strong>
              <small>まずはお試しできます</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span className={styles.creditCardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                <path d="M3.5 9.5h17" />
                <path d="M7 14.5h4" />
                <path d="M15 14.5h2" />
              </svg>
            </span>
            <div className={styles.trustText}>
              <strong>カード登録不要</strong>
              <small>気軽に始められます</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span>✓</span>
            <div className={styles.trustText}>
              <strong>公開前に確認</strong>
              <small>見た目を確認してから公開</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span>↻</span>
            <div className={styles.trustText}>
              <strong>いつでも編集</strong>
              <small>公開後も同じURLで更新</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
