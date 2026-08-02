import Link from "next/link";

import HomeBackLink from "@/components/HomeBackLink";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "@/components/ver2/StandalonePage.module.css";
import { loadSampleBookProject } from "@/lib/sampleBook";
import { SAMPLE_BOOK_ROUTE, SAMPLE_BOOK_THEME } from "@/lib/sampleBookConstants";

export default function SamplePage() {
  const sample = loadSampleBookProject();
  const displayTitleLines = sample.config.displayTitleLines?.filter((line) => line.trim().length > 0);
  const chapterCount = sample.chapters.length;
  const pageEstimate = Math.max(1, Math.ceil(sample.chapters.reduce((sum, chapter) => sum + chapter.body.length, 0) / sample.config.charactersPerPage));

  return (
    <div className={styles.page}>
      <Ver2Header />
      <main className={styles.container}>
        <HomeBackLink />
        <section className={styles.hero}>
          <p className={styles.kicker}>Sample Books</p>
          <h1 className={styles.title}>本物のサンプルWebブック</h1>
          <p className={styles.lead}>実際の公開Readerと同じ体験で、ページめくり・目次・共有導線を確認できます。</p>
        </section>

        <section className={styles.section}>
          {displayTitleLines?.length ? (
            <h2 className="fixed-title-lines fixed-title-lines-inner" aria-label={sample.config.title}>
              {displayTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
          ) : (
            <h2>{sample.config.title}</h2>
          )}
          <p>著者: {sample.config.author} / テーマ: {SAMPLE_BOOK_THEME} / 章数: {chapterCount} / 推定ページ数: {pageEstimate}</p>
          <p style={{ marginTop: "8px" }}>{sample.config.description}</p>
          <div className={styles.actions}>
            <Link href={SAMPLE_BOOK_ROUTE} className={styles.actionPrimary}>この作品を読む</Link>
            <Link href="/signup?next=%2Fbooks%2Fnew" className={styles.actionSecondary}>この形式で自分の作品を作る</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
