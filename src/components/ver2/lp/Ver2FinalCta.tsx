import Link from "next/link";

import Ver2BookShowcase from "./Ver2BookShowcase";
import styles from "./Ver2Landing.module.css";

type Props = {
  ctaText: string;
  onCtaTextChange: (value: string) => void;
  onStart: () => void;
  status?: string;
};

export default function Ver2FinalCta({ ctaText, onCtaTextChange, onStart, status }: Props) {
  return (
    <section className={styles.finalCtaWrap} id="pricing">
      <div className={styles.container}>
        <div className={styles.cta}>
          <div>
            <h2>文章を1つ貼って、Webブックにしてみませんか？</h2>
            <p>20ページまで無料で作成・公開できます。有料の作家プランはいつでも解約できます。</p>
            <div className={styles.ctaComposer}>
              <div className={styles.composerHead}>
                <div className={styles.composerLead}><strong>文章を貼り付ける</strong></div>
                <Link className={styles.sampleLink} href="/sample">▣ サンプル文を見る</Link>
              </div>
              <div className={styles.fileBadges}><span>PDF</span><span>Word</span><span>Markdown</span><span>TXT</span></div>
              <textarea id="ctaText" className={styles.textarea} value={ctaText} onChange={(event) => onCtaTextChange(event.target.value)} placeholder="ここにあなたの文章を貼り付けてください…" />
              <div className={styles.composerFooter}>
                <span className={styles.charCount}><span id="ctaCount">{ctaText.length}</span>文字</span>
                <button type="button" className={styles.createBtn} onClick={onStart}>Webブックを作る</button>
              </div>
              {status ? <p style={{ margin: "8px 0 0", color: "#0f6f5d", fontSize: "12px", fontWeight: 700 }}>{status}</p> : null}
            </div>
          </div>
          <Ver2BookShowcase />
        </div>
      </div>
    </section>
  );
}
