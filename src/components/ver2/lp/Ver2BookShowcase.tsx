import Image from "next/image";
import styles from "./Ver2Landing.module.css";

type Ver2BookShowcaseProps = {
  variant?: "book" | "heroPhoto";
};

export default function Ver2BookShowcase({ variant = "book" }: Ver2BookShowcaseProps) {
  if (variant === "heroPhoto") {
    return (
      <div className={styles.bookShowcase}>
        <Image
          className={styles.heroTabletPhoto}
          src="/home/hero-tablet-webbook-v4.webp"
          alt="木製デスクのタブレットでWebBookMakerのサンプルWebブックを開いているイメージ"
          width={1280}
          height={940}
          sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1280px) min(820px, calc(100vw - 32px)), 53vw"
          preload
        />
      </div>
    );
  }

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
        <div className={styles.featureBadges}>
          <span><i>✓</i> 公開URL</span>
          <span><i>✓</i> X共有</span>
          <span><i>✓</i> note記事</span>
        </div>
      </div>
    </div>
  );
}
