import Link from "next/link";
import { useRef, type DragEvent } from "react";

import { SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";
import Ver2BookShowcase from "./Ver2BookShowcase";
import styles from "./Ver2Landing.module.css";

type AttachedFileSummary = {
  name: string;
  size: number;
  fingerprint: string;
};

type Props = {
  ctaText: string;
  onCtaTextChange: (value: string) => void;
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

export default function Ver2FinalCta({
  ctaText,
  onCtaTextChange,
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
    <section className={styles.finalCtaWrap} id="pricing">
      <div className={styles.container}>
        <div className={styles.cta}>
          <div>
            <h2>文章を1つ貼って、Webブックにしてみませんか？</h2>
            <p>20ページまで無料で作成・公開できます。有料の作家プランはいつでも解約できます。</p>
            <div
              className={styles.ctaComposer}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className={styles.composerHead}>
                <div className={styles.composerLead}><strong>文章を貼り付ける</strong></div>
                <Link className={styles.sampleLink} href={SAMPLE_BOOK_ROUTE}>サンプルのWebブックを見る</Link>
              </div>
              <div className={styles.fileBadges}><span>PDF</span><span>Word</span><span>Markdown</span><span>TXT</span></div>
              <textarea id="ctaText" className={styles.textarea} value={ctaText} onChange={(event) => onCtaTextChange(event.target.value)} placeholder="ここに文章をコピペしてください…" />
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
                  <span className={styles.charCount}><span id="ctaCount">{ctaText.length}</span>文字</span>
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
              {status ? <p style={{ margin: "8px 0 0", color: "#0f6f5d", fontSize: "12px", fontWeight: 700 }}>{status}</p> : null}
            </div>
          </div>
          <div>
            <p className={styles.sampleGuide}>クリックするとサンプルのWebブックが読めます。</p>
            <Link className={styles.finalBookLink} href={SAMPLE_BOOK_ROUTE} aria-label="サンプルのWebブックを見る">
              <Ver2BookShowcase />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
