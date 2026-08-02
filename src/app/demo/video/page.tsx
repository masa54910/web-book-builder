import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

export default function DemoVideoPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo Video</p>
          <h1 className={styles.title}>Webブック紹介動画の見本</h1>
          <p className={styles.lead}>この画面は公開前デモです。書いた作品を縦動画・横動画へ展開し、SNS向けに書き出す流れを体験できます。</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>作成フロー</h2>
            <p>1. 表紙と本文を選択 → 2. 自動ページめくりを生成 → 3. BGM・ナレーションを設定 → 4. MP4で書き出し。</p>
            <div className={styles.chips}>
              <span>縦動画 9:16</span>
              <span>横動画 16:9</span>
              <span>自動ページめくり</span>
              <span>BGM対応予定</span>
            </div>
            <div className={styles.previewPanel}>
              <p>書き出し例: hoshifuru-trailer-vertical.mp4 / hoshifuru-trailer-horizontal.mp4</p>
            </div>
          </article>

          <article className={styles.card}>
            <h2>サンプル動画プレビュー</h2>
            <div className={styles.videoFrame}>
              <div>
                <p className={styles.videoBadge}>Preview 00:34</p>
                <p>星降る街の小さな記録</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
