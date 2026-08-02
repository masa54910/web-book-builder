import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

const xPost = `新作『星降る街の小さな記録』を公開しました。\n\n夜の灯りと流れ星を追いかける、ページめくり型のWebブックです。\nhttps://webbookmaker.app/books/hoshifuru-machi-no-chiisana-kiroku\n\n#WebBookMaker #Web小説 #星空 #読書`;

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
            <div className={styles.previewPanel}>
              <p><strong>タイトル:</strong> 星降る街の小さな記録</p>
              <p><strong>説明:</strong> 夜景と灯りの物語を、ページめくりで読むWebブック。</p>
              <p className={styles.url}>https://webbookmaker.app/books/hoshifuru-machi-no-chiisana-kiroku</p>
            </div>
            <div className={styles.chips}>
              <span>#WebBookMaker</span>
              <span>#Web小説</span>
              <span>#星空</span>
              <span>#流れ星</span>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
