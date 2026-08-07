import Link from "next/link";
import styles from "./Ver2Landing.module.css";

export default function Ver2HowItWorks() {
  return (
    <section className={styles.section} id="samples">
      <div className={styles.container}>
        <h2 className={`${styles.sectionTitle} ${styles.withBookmark}`}>
          <span className={styles.bookmarkMark} aria-hidden="true">付箋</span>
          かんたん3ステップで、あなたの本が完成
        </h2>
        <p className={styles.sectionLead}>文章を貼り、表紙を選び、URLで届ける。迷わず進める制作フローです。</p>
        <div className={styles.steps}>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>1</span><h3>文章を貼り付ける</h3></div>
            <div className={styles.textPanel}>
              むかしむかし、ある町に<br />一人の少女がいました。<br /><br />少女は星が大好きで、<br />夜になるといつも空を<br />見上げていました。
              <span className={styles.textPanelSampleCta} role="presentation" aria-hidden="true">Webブックを作る</span>
            </div>
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>2</span><h3>表紙とテーマを選ぶ</h3></div>
            <div className={styles.coverGrid}><div className={`${styles.cover} ${styles.c1}`}>星降る街の<br />小さな記録</div><div className={`${styles.cover} ${styles.c2}`}>風の庭</div><div className={`${styles.cover} ${styles.c3}`}>フォトブック</div><div className={`${styles.cover} ${styles.c4}`}>旅の記憶</div></div>
            <div className={styles.swatches}><i /><i /><i /><i /><i /><b>＋</b></div>
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>3</span><h3>公開して、読者へ届ける</h3></div>
            <div className={styles.sharebox} aria-label="利用できる共有方法の紹介"><div className={styles.url}>https://webbookmaker.app/books/123456</div><div className={styles.socials}><span className={`${styles.social} ${styles.x}`} role="img" aria-label="Xで共有">𝕏</span><span className={`${styles.social} ${styles.note}`} role="img" aria-label="noteで共有">note</span><span className={`${styles.social} ${styles.line}`} role="img" aria-label="LINEで共有">LINE</span><span className={`${styles.social} ${styles.link}`} role="img" aria-label="URLを共有">🔗</span></div></div>
          </article>
          <article className={`${styles.step} ${styles.growCard}`}>
            <div className={styles.stepHead}><span className={styles.stepNum}>4</span><h3>公開後も作品を分析・編集</h3></div>
            <div className={styles.growthPanel}>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>◔</span><div><strong>読了率</strong><small>読者がどこまで読んだか確認</small></div></div>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>↗</span><div><strong>アクセス数</strong><small>公開後の広がりを把握</small></div></div>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>★</span><div><strong>人気ページ</strong><small>読者の反応が集まる場所を確認</small></div></div>
              <Link className={styles.growthButton} href="/demo/analytics">分析レポートを見る →</Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
