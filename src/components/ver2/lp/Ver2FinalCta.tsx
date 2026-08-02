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
                <Link className={styles.sampleLink} href="/sample">サンプルのWebブックを見る</Link>
              </div>
              <div className={styles.fileBadges}><span>PDF</span><span>Word</span><span>Markdown</span><span>TXT</span></div>
              <textarea id="ctaText" className={styles.textarea} value={ctaText} onChange={(event) => onCtaTextChange(event.target.value)} placeholder="ここにあなたの文章を貼り付けてください…" />
              <div className={styles.composerFooter}>
                <div className={styles.composerMeta}>
                  <span className={styles.charCount}><span id="ctaCount">{ctaText.length}</span>文字</span>
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
                </div>
                <button type="button" className={styles.createBtn} onClick={onStart}>Webブックを作る</button>
              </div>
              {status ? <p style={{ margin: "8px 0 0", color: "#0f6f5d", fontSize: "12px", fontWeight: 700 }}>{status}</p> : null}
            </div>
          </div>
          <Link className={styles.finalBookLink} href="/sample" aria-label="サンプルのWebブックを見る">
            <Ver2BookShowcase />
          </Link>
        </div>
      </div>
    </section>
  );
}
