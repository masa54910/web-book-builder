"use client";

import Link from "next/link";
import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authMode, configurationError } = useAuth();

  if (isLoading) {
    return <div className="reader-loading">アカウント情報を確認しています…</div>;
  }

  if (!user) {
    return (
      <main className="empty-reader-page">
        <section>
          <p className="maker-kicker">WebBookMaker beta</p>
          <HomeBackLink />
          {authMode === "blocked" ? (
            <>
              <h1>Preview環境の設定が不足しています</h1>
              <p>{configurationError}</p>
            </>
          ) : (
            <>
              <h1>ログインが必要です</h1>
              <p>作品の作成・保存・公開にはアカウントが必要です。</p>
              <Link className="maker-primary-link" href="/login">
                ログインする
              </Link>
            </>
          )}
        </section>
      </main>
    );
  }

  return children;
}
