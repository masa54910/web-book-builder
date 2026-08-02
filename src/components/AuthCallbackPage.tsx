"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import HomeBackLink from "@/components/HomeBackLink";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("認証情報を確認しています…");

  useEffect(() => {
    const code = searchParams.get("code");
    const supabase = getSupabaseClient();
    if (!supabase || !code) {
      const timer = window.setTimeout(() => {
        setMessage("認証リンクを処理できませんでした。ログイン画面から再度お試しください。");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setMessage(error.message);
        return;
      }
      router.replace("/dashboard");
    });
  }, [router, searchParams]);

  return (
    <main className="empty-reader-page">
      <section>
        <p className="maker-kicker">WebBookMaker beta</p>
        <HomeBackLink />
        <h1>認証確認</h1>
        <p>{message}</p>
        <Link className="maker-secondary-link" href="/login">
          ログイン画面へ
        </Link>
      </section>
    </main>
  );
}
