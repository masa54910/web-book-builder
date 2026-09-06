import Link from "next/link";

import styles from "./BrandArticleLinks.module.css";

type BrandArticleLinksProps = {
  current: "what" | "why";
};

const articles = {
  what: {
    href: "/about",
    label: "WHAT｜サービスについて",
    title: "WebBookMakerって何？",
  },
  why: {
    href: "/brand-story",
    label: "WHY｜ブランドストーリー",
    title: "なぜ、このWebBookMakerを作ったか。",
  },
} as const;

export default function BrandArticleLinks({ current }: BrandArticleLinksProps) {
  const destination = current === "what" ? articles.why : articles.what;

  return (
    <section className={styles.section} aria-labelledby={`brand-article-links-${current}`}>
      <h2 id={`brand-article-links-${current}`} className={styles.heading}>WebBookMakerをもっと知る</h2>
      <Link className={styles.link} href={destination.href}>
        <span className={styles.copy}>
          <span className={styles.label}>{destination.label}</span>
          <span className={styles.title}>{destination.title}</span>
        </span>
        <span className={styles.arrow} aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
