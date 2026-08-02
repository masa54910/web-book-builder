import styles from "./Ver2Landing.module.css";

export default function Ver2HowItWorks() {
  return (
    <section className={styles.section} id="samples">
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>🌿 かんたん3ステップで、あなたの本が完成 🌿</h2>
        <p className={styles.sectionLead}>文章を貼り、表紙を選び、URLで届ける。迷わず進める制作フローです。</p>
        <div className={styles.steps}>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>1</span><h3>文章を貼り付ける</h3></div>
            <div className={styles.textPanel}>
              むかしむかし、ある町に<br />一人の少女がいました。<br /><br />少女は星が大好きで、<br />夜になるといつも空を<br />見上げていました。
              <div className={styles.textPanelActions}>
                <button
                  type="button"
                  className={styles.attachBtn}
                  onClick={() => {
                    // TODO:
                    // PDF
                    // Word
                    // Markdown
                    // TXT
                    // を読み込み
                    //
                    // 手入力を含め
                    // 無料版20ページ以内か判定
                    //
                    // OKならWebブック生成へ進む
                  }}
                >
                  <span className={styles.attachIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 7.5h5.2l1.7 2h8.1v8.2a2.3 2.3 0 0 1-2.3 2.3H6.8a2.3 2.3 0 0 1-2.3-2.3Z" />
                      <path d="M12 16V9" />
                      <path d="m9.5 11.5 2.5-2.5 2.5 2.5" />
                    </svg>
                  </span>
                  ファイルを添付
                </button>
                <a className={styles.textPanelCta} href="#signup">Webブックを作る</a>
              </div>
            </div>
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>2</span><h3>表紙とテーマを選ぶ</h3></div>
            <div className={styles.coverGrid}><div className={`${styles.cover} ${styles.c1}`}>星降る街の<br />小さな記録</div><div className={`${styles.cover} ${styles.c2}`}>風の庭</div><div className={`${styles.cover} ${styles.c3}`}>フォトブック</div><div className={`${styles.cover} ${styles.c4}`}>旅の記憶</div></div>
            <div className={styles.swatches}><i /><i /><i /><i /><i /><b>＋</b></div>
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>3</span><h3>公開して、読者へ届ける</h3></div>
            <div className={styles.sharebox}><div className={styles.url}>https://webbookmaker.app/books/123456</div><div className={styles.socials}><span className={`${styles.social} ${styles.x}`}>𝕏</span><span className={`${styles.social} ${styles.note}`}>note</span><span className={`${styles.social} ${styles.line}`}>LINE</span><span className={`${styles.social} ${styles.link}`}>🔗</span></div></div>
          </article>
          <article className={`${styles.step} ${styles.growCard}`}>
            <div className={styles.stepHead}><span className={styles.stepNum}>4</span><h3>公開後も作品を分析</h3></div>
            <div className={styles.growthPanel}>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>◔</span><div><strong>読了率</strong><small>読者がどこまで読んだか確認</small></div></div>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>↗</span><div><strong>アクセス数</strong><small>公開後の広がりを把握</small></div></div>
              <div className={styles.growthMetric}><span className={styles.growthIcon}>★</span><div><strong>人気ページ</strong><small>読者の反応が集まる場所を確認</small></div></div>
              <button type="button" className={styles.growthButton}>分析レポート →</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
