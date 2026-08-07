import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import ShareTemplateModalSample from "@/components/demo/ShareTemplateModalSample";
import { NoteShareSampleCard } from "@/components/ver2/lp/HomeShareSamples";
import { SAMPLE_NOTE_TEMPLATE } from "@/lib/sampleShareTemplates";
import styles from "@/components/demo/DemoPages.module.css";

const noteBody = SAMPLE_NOTE_TEMPLATE;

export default function DemoNotePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo note Share</p>
          <h1 className={styles.title}>note記事見本</h1>
          <p className={styles.lead}>導入文、見出し構成、作品URL埋め込みまで含めたnote公開イメージです。</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>記事テンプレート</h2>
            <div className={styles.noteArticle}>
              <p className={styles.postText}>{noteBody}</p>
            </div>
            <div className={styles.row} style={{ marginTop: "12px" }}>
              <CopyButton text={noteBody} label="記事本文をコピー" />
            </div>
          </article>
          <article className={styles.card}>
            <h2>note記事見本</h2>
            <NoteShareSampleCard compact />
          </article>
        </section>

        <section className={styles.card}>
          <h2>共有ボタン押下時のテンプレート表示</h2>
          <ShareTemplateModalSample platform="note" />
        </section>
      </div>
    </main>
  );
}
