import Image from "next/image";
import styles from "./Ver2Landing.module.css";

export default function Ver2BookShowcase() {
  return (
    <div className={styles.bookShowcase} aria-label="Webブック完成イメージ">
      <div className={styles.bookStage}>
        <div className={styles.bookShadow} />
        <div className={styles.openBook}>
          <Image
            className={styles.bookPreviewImage}
            src="/sample-images/hoshifuru-lp-complete.png"
            alt="星降る街の小さな記録の完成版ブックイメージ"
            width={1536}
            height={1024}
            sizes="(max-width: 640px) 92vw, (max-width: 1200px) 78vw, 610px"
            priority
          />
        </div>
        <div className={styles.featureBadges}><span><i>✓</i> 公開URL</span><span><i>✓</i> X共有</span><span><i>✓</i> note記事</span></div>
      </div>
    </div>
  );
}
