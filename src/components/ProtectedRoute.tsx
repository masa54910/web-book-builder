"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authMode, configurationError } = useAuth();
  const router = useRouter();
  const nextValue = typeof window === "undefined"
    ? "/books/new"
    : `${window.location.pathname || "/books/new"}${window.location.search || ""}`;

  useEffect(() => {
    if (isLoading || user || authMode === "blocked") return;
    router.replace(`/login?next=${encodeURIComponent(nextValue)}`);
    router.refresh();
  }, [authMode, isLoading, nextValue, router, user]);

  if (isLoading) {
    return <div className="reader-loading">アカウント情報を確認しています…</div>;
  }

  if (!user) {
    if (authMode !== "blocked") {
      return <div className="reader-loading">ログイン画面へ移動しています…</div>;
    }

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
              <Link className="maker-primary-link" href={`/login?next=${encodeURIComponent(nextValue)}`}>
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
