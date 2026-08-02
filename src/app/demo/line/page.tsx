import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

const lineMessage = "『星降る街の小さな記録』を公開しました。ページめくりで読めるので、夜にぴったりです。\nhttps://webbookmaker.app/books/hoshifuru-machi-no-chiisana-kiroku";

export default function DemoLinePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo LINE Share</p>
          <h1 className={styles.title}>LINE共有見本</h1>
          <p className={styles.lead}>LINEで送る際のメッセージとリンクカードの表示イメージを確認できます。</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>共有メッセージ</h2>
            <div className={styles.previewPanel}>
              <p className={styles.postText}>{lineMessage}</p>
            </div>
            <div className={styles.row} style={{ marginTop: "12px" }}>
              <CopyButton text={lineMessage} label="LINE文面をコピー" />
            </div>
          </article>
          <article className={styles.card}>
            <h2>共有カードイメージ</h2>
            <div className={styles.previewPanel}>
              <p><strong>星降る街の小さな記録</strong></p>
              <p>夜景と流れ星をめぐる短編。スマホでそのまま読めます。</p>
              <p className={styles.url}>https://webbookmaker.app/books/hoshifuru-machi-no-chiisana-kiroku</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
