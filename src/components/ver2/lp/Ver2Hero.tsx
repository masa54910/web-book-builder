import Link from "next/link";
import { useRef, type DragEvent } from "react";

import { SAMPLE_BOOK_GUIDE_TEXT, SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";
import styles from "./Ver2Landing.module.css";
import HomeReveal from "./HomeReveal";
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

type RecommendationIconKind = "note" | "book" | "research" | "knowledge";
type HeroInfoIconKind = "document" | "book" | "folder";

function HeroInfoIcon({ kind }: { kind: HeroInfoIconKind }) {
  if (kind === "document") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 3h11l5 5v21H8z" />
        <path d="M19 3v6h5M12 15h8M12 20h8M12 25h5" />
      </svg>
    );
  }

  if (kind === "book") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3H28v24H7.5A3.5 3.5 0 0 1 4 23.5z" />
        <path d="M4 6.5v17M16 5v21M10 10h3M20 10h4M20 15h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 11h9l2 3h13v14H4z" />
      <path d="M4 11V7h9l2 4M8 20h16" />
    </svg>
  );
}

function RecommendationIcon({ kind }: { kind: RecommendationIconKind }) {
  if (kind === "note") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 5h13l5 5v17H7z" />
        <path d="M20 5v6h5M11 16h10M11 21h7" />
        <path d="m20 24 4-4" />
      </svg>
    );
  }

  if (kind === "book") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 7.5A3.5 3.5 0 0 1 8.5 4H27v22H8.5A3.5 3.5 0 0 1 5 22.5z" />
        <path d="M5 7.5v15M16 6v17M10 10h3M20 11h4M20 16h4" />
      </svg>
    );
  }

  if (kind === "research") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m4 10 12-6 12 6-12 6zM8 13v7c4 3 12 3 16 0v-7M16 16v10M11 27h10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4a8 8 0 0 0-5 14.2c1.2.9 2 2.2 2 3.8h6c0-1.6.8-2.9 2-3.8A8 8 0 0 0 16 4Z" />
      <path d="M13 26h6M14 29h4M16 1v-1M5 5 3.5 3.5M27 5l1.5-1.5M2 13H0M30 13h2" />
    </svg>
  );
}

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
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleLead}>あなたの文章を</span>
              <br />
              <span className={styles.heroTitleLine}>
                <span className={styles.heroTitlePhrase}>「届けて」</span>
                <span className={styles.heroTitlePhrase}>「読まれる」</span>
                一冊に。
              </span>
            </h1>
            <div className={styles.heroInfoCard} aria-label="WebBookMakerの特徴">
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true"><HeroInfoIcon kind="document" /></span>
                <div>
                  <strong>PDFを作る必要はありません。</strong>
                  <span>直接入力でも大丈夫です。（保存機能あり）</span>
                </div>
              </div>
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true"><HeroInfoIcon kind="book" /></span>
                <div>
                  <strong>文章を貼り付けるだけで、表紙・目次・ページめくり付きのWebブックに。</strong>
                </div>
              </div>
              <div className={styles.heroInfoRow}>
                <span className={styles.heroInfoIcon} aria-hidden="true"><HeroInfoIcon kind="folder" /></span>
                <div>
                  <strong>もちろん、PDF・Word・Markdown・TXTなどのファイル読み込みにも対応します。</strong>
                </div>
              </div>
              <div className={styles.heroActionRow} aria-label="WebBookMakerを知る・作る">
                <Link className={styles.heroActionButton} href="/about">
                  <span aria-hidden="true">📖</span>
                  <span className={styles.heroActionText}>
                    <strong>記事でWebBookMakerを知る</strong>
                  </span>
                </Link>
                <Link className={styles.heroActionButton} href="/signup?next=%2Fbooks%2Fnew">
                  <span className={styles.heroActionText}>
                    <strong>無料でWebブックを作ってみる</strong>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className={styles.heroBook}>
            <p className={styles.sampleGuide}>
              <span>{SAMPLE_BOOK_GUIDE_TEXT.replace(/^↓/, "")}</span>
              <span className={styles.sampleGuideArrow} aria-hidden="true">↓</span>
            </p>
            <Link className={styles.heroShowcaseFrame} href={SAMPLE_BOOK_ROUTE} aria-label="サンプルのWebブックを見る">
              <Ver2BookShowcase variant="heroPhoto" />
            </Link>
          </div>
        </div>

        <HomeReveal>
          <div className={styles.heroRecommendations}>
            <div className={styles.recommendHeading}>
              <div className={styles.recommendLabel}>こんな方におすすめ</div>
              <Link className={styles.useCasesCta} href="/use-cases">
                詳しい活用例はこちら <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className={styles.heroRecommendationGrid}>
              <article className={styles.heroRecommendationCard}>
                <span className={styles.heroRecommendationIcon}><RecommendationIcon kind="note" /></span>
                <div>
                  <h3>note・ブログを書いている方</h3>
                  <p>過去の記事をテーマごとのWebブックへ。</p>
                </div>
              </article>
              <article className={styles.heroRecommendationCard}>
                <span className={styles.heroRecommendationIcon}><RecommendationIcon kind="book" /></span>
                <div>
                  <h3>小説・エッセイを書いている方</h3>
                  <p>書きためた作品を、読者へ届ける作品に。</p>
                </div>
              </article>
              <article className={styles.heroRecommendationCard}>
                <span className={styles.heroRecommendationIcon}><RecommendationIcon kind="research" /></span>
                <div>
                  <h3>研究・論文を書いている方</h3>
                  <p>卒論・修論・レポートを、提出して終わらせない。</p>
                </div>
              </article>
              <article className={styles.heroRecommendationCard}>
                <span className={styles.heroRecommendationIcon}><RecommendationIcon kind="knowledge" /></span>
                <div>
                  <h3>専門知識を発信している方</h3>
                  <p>教材・ノウハウ・ガイド本を、読みやすい一冊へ。</p>
                </div>
              </article>
            </div>
          </div>
        </HomeReveal>

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

      </div>
    </section>
  );
}
