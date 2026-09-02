import Image from "next/image";
import Link from "next/link";

import DemoTopActions from "@/components/demo/DemoTopActions";
import ServiceIcon from "@/components/ui/ServiceIcons";
import styles from "@/components/demo/DemoPages.module.css";
import { SAMPLE_BOOK_COVER_IMAGE, SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";

export default function DemoAuthorPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo Author Page</p>
          <h1 className={`${styles.title} ${styles.authorTitle}`}>作者プロフィール</h1>
          <p className={styles.lead}>プロフィール、SNS、公開作品一覧をまとめた公開イメージです。</p>
        </section>

        <article className={styles.card}>
          <div className={styles.authorNameRow}>
            <span className={styles.authorAvatar}>
              <Image src="/characters/shiori-bust.png" alt="しおりちゃん" fill sizes="64px" />
            </span>
            <h2 className={styles.authorName}>本野しおり（サンプル作者）</h2>
          </div>
          <p>夜の街と小さな灯りをテーマに、読み終わったあとに余韻が残る短編を制作しています。</p>
          <div className={styles.chips}>
            <span><ServiceIcon service="x" className={`${styles.profileSocialIcon} ${styles.profileSocialIconX}`} />@webbookmaker</span>
            <span><ServiceIcon service="note" className={`${styles.profileSocialIcon} ${styles.profileSocialIconNote}`} />webbookmaker</span>
            <span><ServiceIcon service="instagram" className={`${styles.profileSocialIcon} ${styles.profileSocialIconInstagram}`} />@webbookmaker</span>
          </div>
        </article>

        <section className={styles.bookGrid}>
          <article className={styles.bookCard}>
            <div className={styles.bookThumb}><Image src={SAMPLE_BOOK_COVER_IMAGE} alt="星降る街の小さな記録 表紙" fill sizes="(max-width: 520px) 100vw, 180px" /></div>
            <h4>星降る街の小さな記録</h4>
            <p>夜景と流れ星、記録する少女の物語。</p>
            <Link className="maker-primary-link" href={SAMPLE_BOOK_ROUTE}>この作品を読む</Link>
          </article>
          <article className={styles.bookCard}>
            <div className={styles.bookThumb}><Image src="/sample-images/hoshifuru-01.webp" alt="風見鶏の灯台 表紙" fill sizes="(max-width: 520px) 100vw, 180px" /></div>
            <h4>風見鶏の灯台</h4>
            <p>海辺の街を舞台にした短編デモ。</p>
            <div className={styles.bookAction}>
              <Link className="maker-secondary-link" href="/demo/share">この作品を見る</Link>
              <span className={styles.bookStatus}>準備中</span>
            </div>
          </article>
          <article className={styles.bookCard}>
            <div className={styles.bookThumb}><Image src="/sample-images/hoshifuru-02.webp" alt="月明かりの停留所 表紙" fill sizes="(max-width: 520px) 100vw, 180px" /></div>
            <h4>月明かりの停留所</h4>
            <p>夜更けのバス停から始まる掌編デモ。</p>
            <div className={styles.bookAction}>
              <Link className="maker-secondary-link" href="/demo/x">この作品を見る</Link>
              <span className={styles.bookStatus}>準備中</span>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
