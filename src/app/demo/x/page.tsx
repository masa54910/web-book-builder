import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import ShareTemplateModalSample from "@/components/demo/ShareTemplateModalSample";
import { XShareSampleCard } from "@/components/ver2/lp/HomeShareSamples";
import { SAMPLE_X_TEMPLATE } from "@/lib/sampleShareTemplates";
import styles from "@/components/demo/DemoPages.module.css";

const xPost = SAMPLE_X_TEMPLATE;

export default function DemoXPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo X Share</p>
          <h1 className={styles.title}>X投稿見本</h1>
          <p className={styles.lead}>実際のX投稿画面に近いイメージで、投稿文・カード・OGP・ハッシュタグの完成形を確認できます。</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>投稿文</h2>
            <div className={styles.previewPanel}>
              <p className={styles.postText}>{xPost}</p>
            </div>
            <div className={styles.row} style={{ marginTop: "12px" }}>
              <CopyButton text={xPost} label="投稿文をコピー" />
            </div>
          </article>

          <article className={styles.card}>
            <h2>Xカード / OGP</h2>
            <XShareSampleCard />
            <div className={styles.chips}>
              <span>#WebBookMaker</span>
              <span>#Webブック</span>
              <span>#星降る街の小さな記録</span>
            </div>
          </article>
        </section>

        <section className={styles.card}>
          <h2>共有ボタン押下時のテンプレート表示</h2>
          <ShareTemplateModalSample platform="x" />
        </section>
      </div>
    </main>
  );
}
