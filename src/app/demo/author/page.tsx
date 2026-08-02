import Link from "next/link";

import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";
import { SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";

export default function DemoAuthorPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo Author Page</p>
          <h1 className={styles.title}>作者ページ見本</h1>
          <p className={styles.lead}>プロフィール、SNS、公開作品一覧をまとめた公開イメージです。</p>
        </section>

        <article className={styles.card}>
          <h2>WebBookMaker サンプル作者</h2>
          <p>夜の街と小さな灯りをテーマに、読み終わったあとに余韻が残る短編を制作しています。</p>
          <div className={styles.chips}>
            <span>X: @webbookmaker</span>
            <span>note: webbookmaker</span>
            <span>Web: webbookmaker.app</span>
          </div>
        </article>

        <section className={styles.bookGrid}>
          <article className={styles.bookCard}>
            <h4>星降る街の小さな記録</h4>
            <p>夜景と流れ星、記録する少女の物語。</p>
            <Link className="maker-primary-link" href={SAMPLE_BOOK_ROUTE}>この作品を読む</Link>
          </article>
          <article className={styles.bookCard}>
            <h4>風見鶏の灯台</h4>
            <p>海辺の街を舞台にした短編デモ。</p>
            <Link className="maker-secondary-link" href="/demo/share">共有見本を見る</Link>
          </article>
          <article className={styles.bookCard}>
            <h4>月明かりの停留所</h4>
            <p>夜更けのバス停から始まる掌編デモ。</p>
            <Link className="maker-secondary-link" href="/demo/x">X見本を見る</Link>
          </article>
        </section>
      </div>
    </main>
  );
}
