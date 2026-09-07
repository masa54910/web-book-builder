"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAppEnv } from "@/lib/appEnv";
import { safeExternalUrl } from "@/lib/productTypes";
import styles from "@/components/ver2/lp/Ver2Landing.module.css";
import LanguageSelector from "@/components/LanguageSelector";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";

export default function AppHeader({
  publicAuthor = false,
  authorIsOwner = false,
}: {
  publicAuthor?: boolean;
  authorIsOwner?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const { locale } = useUiLocale();
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
          {publicAuthor ? (
            authorIsOwner ? (
              <div className="author-owner-nav">
                <Link className="nav-cta" href="/dashboard">
                  {uiT(locale, "navigation.library")}
                </Link>
                <small>このボタンは読者のページには表示されません。</small>
              </div>
            ) : null
          ) : isLoading ? null : user ? (
            <>
              <Link href="/dashboard">{uiT(locale, "navigation.library")}</Link>
              <Link href="/analytics">{uiT(locale, "navigation.analytics")}</Link>
              <Link href="/settings">{uiT(locale, "navigation.settings")}</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/#features">{uiT(locale, "navigation.howItWorks")}</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/help">Help</Link>
              <Link href="/sample">サンプル</Link>
              {feedbackUrl ? (
                <a href={feedbackUrl} target="_blank" rel="noopener noreferrer nofollow">
                  フィードバック
                </a>
              ) : null}
              <Link href="/login">{uiT(locale, "navigation.login")}</Link>
              <Link className="nav-cta" href="/signup">
                {uiT(locale, "auth.signup")}
              </Link>
            </>
          )}
          <LanguageSelector />
        </nav>
      </header>
    </>
  );
}
