import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

const publicUrl = "https://webbookmaker.app/books/xxxx";

export default function DemoSharePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo Share Link</p>
          <h1 className={styles.title}>公開URL共有見本</h1>
          <p className={styles.lead}>リンクだけを配布する場合の最短導線を体験できるデモです。</p>
        </section>

        <article className={styles.card}>
          <h2>共有URL</h2>
          <p className={styles.url}>{publicUrl}</p>
          <div className={styles.row} style={{ marginTop: "12px" }}>
            <CopyButton text={publicUrl} label="公開URLをコピー" />
          </div>
          <div className={styles.previewPanel}>
            <p>リンク送信先で表示される見本: タイトル、表紙、短い紹介文、OGPカード。</p>
          </div>
        </article>
      </div>
    </main>
  );
}
