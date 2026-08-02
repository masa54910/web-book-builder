import Link from "next/link";

import styles from "./Ver2Landing.module.css";
import Ver2BookShowcase from "./Ver2BookShowcase";

type Props = {
  heroText: string;
  onHeroTextChange: (value: string) => void;
  onStart: () => void;
  status?: string;
};

export default function Ver2Hero({ heroText, onHeroTextChange, onStart, status }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>PDF不要。文章をコピペするだけ。</div>
            <h1 className={styles.heroTitle}>
              書いた文章を、
              <br />
              <span className={styles.heroTitleLine}>そのまま<span>Webブック</span>に。</span>
            </h1>
            <p className={styles.sub}>PDFを作る必要はありません。直接入力でも大丈夫です。（保存機能あり）</p>
            <p className={styles.desc}>文章を貼り付けるだけで、表紙・目次・ページめくり付きのWebブックに。もちろん、PDF・Word・Markdown・TXTなどのファイル読み込みにも対応します。</p>
          </div>

          <div className={styles.heroBook}>
            <div className={styles.heroShowcaseFrame}>
              <Ver2BookShowcase />
            </div>
          </div>
        </div>

        <div className={styles.heroComposerRow}>
          <div className={styles.composer}>
            <div className={styles.composerHead}>
              <div className={styles.composerLead}><strong>文章を貼り付ける</strong></div>
              <Link className={styles.sampleLink} href="/sample">▣ サンプル文を見る</Link>
            </div>
            <div className={styles.fileBadges} aria-label="対応ファイル形式">
              <span>PDF</span><span>Word</span><span>Markdown</span><span>TXT</span>
            </div>
            <div className={styles.reassuranceRow} aria-label="安心して使えるポイント">
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>✓</span><div><strong>登録前でも入力できます</strong><small>まずはそのまま試せます</small></div></div>
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>↻</span><div><strong>自動保存に対応</strong><small>途中で閉じても安心です</small></div></div>
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>🔒</span><div><strong>勝手に公開されません</strong><small>確認してから公開できます</small></div></div>
            </div>
            <textarea id="heroText" className={styles.textarea} value={heroText} onChange={(event) => onHeroTextChange(event.target.value)} placeholder={"ここに文章を貼り付けてください。\n\nまたは、PDF・Word・Markdown・TXTファイルをドラッグ＆ドロップ。\n改行もそのまま反映されます。"} />
            <div className={styles.composerFooter}>
              <span className={styles.charCount}><span id="heroCount">{heroText.length}</span>文字</span>
              <button type="button" className={styles.createBtn} onClick={onStart}>Webブックを作る</button>
            </div>
            {status ? <p style={{ margin: "8px 0 0", color: "#0f6f5d", fontSize: "12px", fontWeight: 700 }}>{status}</p> : null}
          </div>
        </div>

        <div className={styles.featureCards}>
          <div className={styles.featureCard}><div className={styles.featureIcon}>🔗</div><div><h3>すぐに公開</h3><p>URLですぐ読める</p></div></div>
          <div className={styles.featureCard}><div className={styles.featureIcon}>📖</div><div><h3>本らしい読書体験</h3><p>ページめくりに対応</p></div></div>
          <div className={styles.featureCard}><div className={styles.featureIcon}>✨</div><div><h3>簡単に共有できる</h3><p>X・note・LINEに対応</p></div></div>
        </div>
      </div>
    </section>
  );
}
