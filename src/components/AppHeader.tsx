"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAppEnv } from "@/lib/appEnv";
import { safeExternalUrl } from "@/lib/productTypes";

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
        <Link className="app-logo" href="/">
          WebBookMaker <span>beta</span>
        </Link>
        <nav aria-label="主要ナビゲーション">
          {isLoading ? null : user ? (
            <>
              <Link href="/dashboard">作品一覧</Link>
              <Link href="/analytics">分析</Link>
              <Link href="/settings">設定</Link>
              <Link className="app-user-chip" href="/settings" aria-label="アカウント設定へ移動">
                {user.displayName || user.email || "ユーザー"}
              </Link>
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
