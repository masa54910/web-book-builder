import Link from "next/link";
import { useRef, type DragEvent } from "react";

import { SAMPLE_BOOK_GUIDE_TEXT, SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";
import styles from "./Ver2Landing.module.css";
import Ver2BookShowcase from "./Ver2BookShowcase";

type AttachedFileSummary = {
  name: string;
  size: number;
  fingerprint: string;
};

type Props = {
  heroText: string;
  onHeroTextChange: (value: string) => void;
  onStart: () => void;
  onFileSelected: (file: File) => void;
  attachedFiles: AttachedFileSummary[];
  onRemoveAttachedFile: (fingerprint: string) => void;
  isImporting?: boolean;
  status?: string;
};

const ACCEPTED_MANUSCRIPT_TYPES = ".txt,.md,.markdown,.docx,.pdf,.zip,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip";

function readableFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.ceil(size / 1024)}KB`;
  return `${size}B`;
}

export default function Ver2Hero({
  heroText,
  onHeroTextChange,
  onStart,
  onFileSelected,
  attachedFiles,
  onRemoveAttachedFile,
  isImporting,
  status,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>PDF不要。文章をコピペするだけ。</div>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleLead}>書いた文章を</span>
              <br />
              <span className={styles.heroTitleLine}>そのまま<span>Webブック</span>に。</span>
            </h1>
            <div className={styles.heroInfoCard} aria-label="WebBookMakerの特徴">
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true">▤</span>
                <div>
                  <strong>PDFを作る必要はありません。</strong>
                  <span>直接入力でも大丈夫です。（保存機能あり）</span>
                </div>
              </div>
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true">▥</span>
                <div>
                  <strong>文章を貼り付けるだけで、表紙・目次・ページめくり付きのWebブックに。</strong>
                </div>
              </div>
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true">▰</span>
                <div>
                  <strong>もちろん、PDF・Word・Markdown・TXTなどのファイル読み込みにも対応します。</strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroBook}>
            <p className={styles.sampleGuide}>{SAMPLE_BOOK_GUIDE_TEXT}</p>
            <Link className={styles.heroShowcaseFrame} href={SAMPLE_BOOK_ROUTE} aria-label="サンプルのWebブックを見る">
              <Ver2BookShowcase />
            </Link>
          </div>
        </div>

        <div className={styles.heroComposerRow} id="create">
          <div
            className={styles.composer}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className={styles.composerHead}>
              <div className={styles.composerLead}><strong>文章を貼り付ける</strong></div>
              <Link className={styles.sampleLink} href={SAMPLE_BOOK_ROUTE}>サンプルのWebブックを見る</Link>
            </div>
            <div className={styles.fileBadges} aria-label="対応ファイル形式">
              <span>PDF</span><span>Word</span><span>Markdown</span><span>TXT</span>
            </div>
            <div className={styles.reassuranceRow} aria-label="安心して使えるポイント">
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>✓</span><div><strong>登録前でも入力できます</strong><small>まずはそのまま試せます</small></div></div>
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>↻</span><div><strong>自動保存に対応</strong><small>途中で閉じても安心です</small></div></div>
              <div className={styles.reassuranceItem}><span className={styles.reassuranceIcon}>🔒</span><div><strong>勝手に公開されません</strong><small>確認してから公開できます</small></div></div>
            </div>
            <textarea id="heroText" className={styles.textarea} value={heroText} onChange={(event) => onHeroTextChange(event.target.value)} placeholder={"ここに文章をコピペしてください。\n\nまたは、PDF・Word・Markdown・TXTファイルをドラッグ＆ドロップ。\n改行もそのまま反映されます。"} />
            <input
              ref={inputRef}
              className={styles.fileInputHidden}
              type="file"
              accept={ACCEPTED_MANUSCRIPT_TYPES}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFileSelected(file);
                event.currentTarget.value = "";
              }}
            />
            <div className={styles.composerFooter}>
              <div className={styles.composerMeta}>
                <span className={styles.charCount}><span id="heroCount">{heroText.length}</span>文字</span>
                <button
                  type="button"
                  className={styles.attachBtn}
                  disabled={isImporting}
                  onClick={() => inputRef.current?.click()}
                >
                  <span className={styles.attachIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 7.5h5.2l1.7 2h8.1v8.2a2.3 2.3 0 0 1-2.3 2.3H6.8a2.3 2.3 0 0 1-2.3-2.3Z" />
                      <path d="M12 16V9" />
                      <path d="m9.5 11.5 2.5-2.5 2.5 2.5" />
                    </svg>
                  </span>
                  {isImporting ? "読み込み中…" : "ファイルを添付"}
                </button>
              </div>
              <button type="button" className={styles.createBtn} onClick={onStart}>Webブックを作る</button>
            </div>
            {attachedFiles.length ? (
              <div className={styles.attachedFiles} aria-label="添付済みファイル">
                {attachedFiles.map((file) => (
                  <span key={file.fingerprint}>
                    {file.name} <small>{readableFileSize(file.size)}</small>
                    <button type="button" onClick={() => onRemoveAttachedFile(file.fingerprint)}>
                      解除
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {status ? <p style={{ margin: "8px 0 0", color: "#156b9e", fontSize: "12px", fontWeight: 700 }}>{status}</p> : null}
          </div>
        </div>

        <div className={styles.recommendLabel}>こんな方におすすめ</div>
        <div className={styles.featureCards}>
          <div className={styles.featureCard}><div className={styles.featureIcon}>🔗</div><div><h3>すぐに公開</h3><p>URLですぐ読める</p></div></div>
          <div className={styles.featureCard}><div className={styles.featureIcon}>📖</div><div><h3>本らしい読書体験</h3><p>ページめくりに対応</p></div></div>
          <div className={styles.featureCard}><div className={styles.featureIcon}>✨</div><div><h3>簡単に共有できる</h3><p>X・note・LINEに対応</p></div></div>
        </div>
      </div>
    </section>
  );
}
