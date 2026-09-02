import Image from "next/image";

import ServiceIcon from "@/components/ui/ServiceIcons";
import {
  SAMPLE_BOOK_AUTHOR,
  SAMPLE_BOOK_COVER_IMAGE,
  SAMPLE_BOOK_TITLE,
} from "@/lib/sampleBookConstants";
import { SAMPLE_BOOK_DESCRIPTION, SAMPLE_NOTE_TEMPLATE, SAMPLE_X_TEMPLATE } from "@/lib/sampleShareTemplates";

import styles from "./Ver2Landing.module.css";

type SampleCardProps = {
  compact?: boolean;
};

function SampleCover({ alt }: { alt: string }) {
  return (
    <div className={styles.shareSampleCover}>
      <Image
        src={SAMPLE_BOOK_COVER_IMAGE}
        alt={alt}
        fill
        sizes="(max-width: 700px) 80vw, 280px"
      />
    </div>
  );
}

export function XShareSampleCard({ compact = false }: SampleCardProps = {}) {
  return (
    <div className={`${styles.shareSampleCard} ${styles.xShareSample} ${compact ? styles.shareSampleCardCompact : ""}`} aria-label="X共有テンプレートの見本">
      <div className={styles.shareSampleHeader}>
        <span className={`${styles.shareSampleServiceIcon} ${styles.shareSampleServiceIconX}`} aria-hidden="true">
          <ServiceIcon service="x" />
        </span>
        <span className={styles.shareSampleHeading}>
          <strong>WebBookMaker</strong>
          <small>投稿テンプレートの見本</small>
        </span>
        <span className={styles.shareSampleMenu} aria-hidden="true">•••</span>
      </div>

      <p className={styles.shareSamplePostText}>{SAMPLE_X_TEMPLATE}</p>

      <div className={styles.shareSampleLinkCard}>
        <SampleCover alt={`${SAMPLE_BOOK_TITLE} の共有カード見本`} />
        <div className={styles.shareSampleLinkMeta}>
          <small>webbookmaker.vercel.app</small>
          <strong>{SAMPLE_BOOK_TITLE}</strong>
          <span>{SAMPLE_BOOK_DESCRIPTION}</span>
        </div>
      </div>

      <div className={styles.shareSampleActions} aria-hidden="true">
        <span>○</span>
        <span>↻</span>
        <span>♡</span>
        <span>□</span>
        <span>↥</span>
      </div>
    </div>
  );
}

export function NoteShareSampleCard({ compact = false }: SampleCardProps = {}) {
  return (
    <div className={`${styles.shareSampleCard} ${styles.noteShareSample} ${compact ? styles.shareSampleCardCompact : ""}`} aria-label="note記事内の埋め込みWebブック見本">
      <div className={styles.noteSampleTopbar}>
        <strong className={styles.noteSampleWordmark}>note</strong>
        <span>埋め込み型のブック見本</span>
        <span className={styles.shareSampleMenu} aria-hidden="true">•••</span>
      </div>

      <div className={styles.noteSampleArticle}>
        <span className={styles.noteSampleLabel}>WebBookMaker公式</span>
        <h4>{SAMPLE_BOOK_TITLE}</h4>
        <div className={styles.noteSampleEmbed} aria-label="note記事内に埋め込まれたWebブック見本">
          <div className={styles.noteSampleEmbedBar}>
            <span>WebBookMaker</span>
            <small>埋め込み型のWebブック</small>
          </div>
          <div className={styles.noteSampleEmbedBody}>
            <SampleCover alt={`${SAMPLE_BOOK_TITLE} の埋め込みWebブック見本`} />
            <div className={styles.noteSampleEmbedMeta}>
              <strong>{SAMPLE_BOOK_TITLE}</strong>
              <span>ページをめくって読む</span>
              <span className={styles.noteSampleEmbedAction}>Webブックを読む ↗</span>
            </div>
          </div>
        </div>
        <p className={styles.noteSampleTemplateText}>{SAMPLE_NOTE_TEMPLATE}</p>
        <div className={styles.noteSampleAuthor}>
          <span className={styles.noteSampleAuthorMark} aria-hidden="true">W</span>
          <span>{SAMPLE_BOOK_AUTHOR}</span>
        </div>
      </div>
    </div>
  );
}
