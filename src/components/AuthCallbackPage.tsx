"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import HomeBackLink from "@/components/HomeBackLink";
import {
  getAuthCallbackErrorMessage,
  isSignupCallback,
  resolveAuthCallbackDestination,
} from "@/lib/auth/callbackRouting";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("認証情報を確認しています…");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = searchParams.get("code");
    const type = searchParams.get("type") ?? hashParams.get("type");
    const flow = searchParams.get("flow");
    const next = searchParams.get("next");
    const callbackError =
      searchParams.get("error") ?? hashParams.get("error");
    const callbackErrorCode =
      searchParams.get("error_code") ?? hashParams.get("error_code");
    const callbackErrorDescription =
      searchParams.get("error_description") ?? hashParams.get("error_description");
    const destination = resolveAuthCallbackDestination({ flow, type, next });
    const supabase = getSupabaseClient();
    if (!supabase) {
      const timer = window.setTimeout(() => {
        setMessage("認証情報を確認できませんでした。ログイン画面から再度お試しください。");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (callbackError || callbackErrorCode || callbackErrorDescription) {
      const timer = window.setTimeout(() => {
        setMessage(getAuthCallbackErrorMessage(callbackErrorCode, callbackErrorDescription ?? callbackError));
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const complete = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setMessage(getAuthCallbackErrorMessage(null, error.message));
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (active) setMessage(getAuthCallbackErrorMessage(null, error.message));
        return;
      }

      if (data.session) {
        if (active) {
          setMessage("メールアドレスの確認が完了しました。");
          router.replace(destination);
          router.refresh();
        }
        return;
      }

      if (isSignupCallback({ flow, type })) {
        if (active) {
          setMessage("メールアドレスの確認が完了しました。ログインしてください。");
          window.setTimeout(() => router.replace("/login"), 900);
        }
        return;
      }

      if (active) {
        setMessage("認証情報を確認できませんでした。ログイン画面から再度お試しください。");
      }
    };

    void complete();
    return () => {
      active = false;
    };
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
