"use client";

import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAppEnv } from "@/lib/appEnv";
import { safeExternalUrl } from "@/lib/productTypes";
import styles from "@/components/ver2/lp/Ver2Landing.module.css";

export default function AppHeader() {
  const { user, isLoading } = useAuth();
  const isPreview = getAppEnv() === "preview";
  const feedbackUrl = safeExternalUrl(process.env.NEXT_PUBLIC_FEEDBACK_URL ?? "");

  return (
    <>
      {isPreview ? (
        <div className="beta-banner" role="status">
          <strong>限定ベータ版</strong>
          <span>重要な原稿は必ず手元にも保存してください。仕様やデータ調整を行う場合があります。</span>
        </div>
      ) : null}
      <header className="app-header">
        <BrandLogo
          href="/"
          ariaLabel="WebBookMaker TOP"
          className={styles.brand}
          iconClassName={styles.logoIcon}
          svgClassName={styles.logoTablet}
          copyClassName={styles.logoCopy}
          wordClassName={styles.logoWord}
          taglineClassName={styles.logoTagline}
        />
        <nav aria-label="主要ナビゲーション">
          {isLoading ? null : user ? (
            <>
              <Link href="/dashboard">作品一覧</Link>
              <Link href="/analytics">分析</Link>
              <Link href="/settings">設定</Link>
            </>
          ) : (
            <>
              <Link href="/#features">機能</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/help">Help</Link>
              <Link href="/sample">サンプル</Link>
              {feedbackUrl ? (
                <a href={feedbackUrl} target="_blank" rel="noopener noreferrer nofollow">
                  フィードバック
                </a>
              ) : null}
              <Link href="/login">ログイン</Link>
              <Link className="nav-cta" href="/signup">
                無料で始める
              </Link>
            </>
          )}
        </nav>
      </header>
    </>
  );
}
