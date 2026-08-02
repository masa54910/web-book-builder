import CopyButton from "@/components/demo/CopyButton";
import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

const noteBody = `# 新作『星降る街の小さな記録』を公開しました\n\n## どんな作品？\n夜の街を記録する少女が、流れ星の秘密を追う短編です。\n\n## 読みどころ\n- ページをめくる読書体験\n- 星空と街灯りのビジュアル\n- 3章構成で読みやすいテンポ\n\n## 作品URL\nhttps://webbookmaker.app/books/hoshifuru-machi-no-chiisana-kiroku`;

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

        <article className={styles.card}>
          <h2>記事テンプレート</h2>
          <div className={styles.noteArticle}>
            <p className={styles.postText}>{noteBody}</p>
          </div>
          <div className={styles.row} style={{ marginTop: "12px" }}>
            <CopyButton text={noteBody} label="記事本文をコピー" />
          </div>
        </article>
      </div>
    </main>
  );
}
