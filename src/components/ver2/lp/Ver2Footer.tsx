import Link from "next/link";

import BrandLogo from "@/components/ui/BrandLogo";
import { SAMPLE_BOOK_ROUTE } from "@/lib/sampleBookConstants";
import styles from "./Ver2Landing.module.css";

export default function Ver2Footer() {
  return (
    <footer className={styles.footer} id="help">
      <div className={`${styles.container} ${styles.footerRow}`}>
        <BrandLogo
          href="/"
          ariaLabel="WebBookMaker ホーム"
          className={styles.footerBrand}
          iconClassName={styles.footerBrandIcon}
          svgClassName={styles.footerBrandSvg}
          copyClassName={styles.footerBrandCopy}
          wordClassName={styles.footerBrandWord}
          taglineClassName={styles.footerBrandTagline}
          tagline="あなたの文章を、そのままWeb書籍に。"
        />
        <div className={styles.footerLinks}><Link href="/#samples">作り方</Link><Link href={SAMPLE_BOOK_ROUTE}>サンプル</Link><Link href="/pricing">料金プラン</Link><Link href="/#promotion">作品を広める</Link><Link href="/#faq">よくある質問</Link><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/commercial-transactions">特定商取引法に基づく表記</Link><Link href="/guidelines">投稿ガイドライン</Link><Link href="/refund">返金方針</Link><Link href="/contact">お問い合わせ</Link></div>
      </div>
      <div className={styles.copy}>© 2026 WebBookMaker All rights reserved.</div>
    </footer>
  );
}
