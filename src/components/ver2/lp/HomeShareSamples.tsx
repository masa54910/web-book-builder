import Image from "next/image";

import ServiceIcon from "@/components/ui/ServiceIcons";
import {
  SAMPLE_BOOK_AUTHOR,
  SAMPLE_BOOK_COVER_IMAGE,
  SAMPLE_BOOK_DESCRIPTION,
  SAMPLE_BOOK_ROUTE,
  SAMPLE_BOOK_TITLE,
} from "@/lib/sampleBookConstants";
import { buildShareTemplate, buildXShareTemplate } from "@/lib/shareTemplates";

import styles from "./Ver2Landing.module.css";

const SAMPLE_BOOK_URL = `https://webbookmaker.vercel.app${SAMPLE_BOOK_ROUTE}`;

const SAMPLE_X_TEMPLATE = buildXShareTemplate({
  title: SAMPLE_BOOK_TITLE,
  description: SAMPLE_BOOK_DESCRIPTION,
  url: SAMPLE_BOOK_URL,
  hashtags: ["WebBookMaker", "Webブック", SAMPLE_BOOK_TITLE],
});

const SAMPLE_NOTE_TEMPLATE = buildShareTemplate({
  platform: "note",
  title: SAMPLE_BOOK_TITLE,
  description: SAMPLE_BOOK_DESCRIPTION,
  url: SAMPLE_BOOK_URL,
});

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

export function XShareSampleCard() {
  return (
    <div className={`${styles.shareSampleCard} ${styles.xShareSample}`} aria-label="X共有テンプレートの見本">
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

export function NoteShareSampleCard() {
  return (
    <div className={`${styles.shareSampleCard} ${styles.noteShareSample}`} aria-label="note記事テンプレートの見本">
      <div className={styles.noteSampleTopbar}>
        <strong className={styles.noteSampleWordmark}>note</strong>
        <span>記事テンプレートの見本</span>
        <span className={styles.shareSampleMenu} aria-hidden="true">•••</span>
      </div>

      <div className={styles.noteSampleArticle}>
        <span className={styles.noteSampleLabel}>WebBookMaker公式</span>
        <h4>{SAMPLE_BOOK_TITLE}</h4>
        <SampleCover alt={`${SAMPLE_BOOK_TITLE} のnote記事見本`} />
        <p className={styles.noteSampleTemplateText}>{SAMPLE_NOTE_TEMPLATE}</p>
        <div className={styles.noteSampleAuthor}>
          <span className={styles.noteSampleAuthorMark} aria-hidden="true">W</span>
          <span>{SAMPLE_BOOK_AUTHOR}</span>
        </div>
      </div>
    </div>
  );
}
