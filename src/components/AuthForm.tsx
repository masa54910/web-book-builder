"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BrandLogo from "@/components/ui/BrandLogo";
import HomeBackLink from "@/components/HomeBackLink";
import { useAuth } from "@/lib/auth/AuthContext";

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/dashboard";
  return value;
}

function selectedPlanMessage(plan: string | null) {
  if (plan === "publish") return "出版プランは現在準備中です。無料プランで先に作品作成を始められます。";
  if (plan === "writer") return "作家プランは現在準備中です。無料プランで先に作品作成を始められます。";
  return "";
}

export default function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const router = useRouter();
  const { signIn, signUp, resetPassword, authMode, configurationError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title =
    mode === "login" ? "ログイン" : mode === "signup" ? "無料で始める" : "パスワード再設定";

  useEffect(() => {
    if (authMode === "blocked" && configurationError) {
      console.error("Runtime configuration error:", configurationError);
    }
  }, [authMode, configurationError]);

  const submit = async () => {
    if (isSubmitting || authMode === "blocked") return;
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (mode === "signup" && !passwordConfirm.trim()) {
      setError("パスワード（確認）を入力してください。");
      return;
    }
    if (mode === "signup" && password !== passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);
    const result =
      mode === "login"
        ? await signIn(email, password)
        : mode === "signup"
          ? await signUp(email, password, displayName)
          : await resetPassword(email);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "forgot") {
      const forgotResult = result as Awaited<ReturnType<typeof resetPassword>>;
      setMessage(forgotResult.message ?? "再設定手順を送信しました。");
      return;
    }

    if (mode === "signup") {
      const planMessage = selectedPlanMessage(new URLSearchParams(window.location.search).get("plan"));
      if (planMessage) {
        setMessage(planMessage);
        return;
      }
    }

    router.push(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandLogo
          href="/"
          className="auth-brand"
          iconClassName="auth-brand-icon"
          copyClassName="auth-brand-copy"
          wordClassName=""
          wordMakerClassName=""
          taglineClassName=""
          tagline="あなたの文章を、そのままWeb書籍に。"
        />
        <HomeBackLink className="auth-home-link" />
        <h1>{title}</h1>
        {authMode === "demo" ? (
          <p className="auth-notice">
            Supabase環境変数が未設定のため、ローカルデモ認証で動作しています。本番ではSupabase Authへ切り替わります。
          </p>
        ) : null}
        {authMode === "blocked" ? (
          <p className="form-error" aria-live="polite">
            現在ログイン機能を利用できません。しばらくしてから再度お試しください。
          </p>
        ) : null}
        <label>
          <span>メールアドレス</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <label>
            <span>表示名</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        ) : null}
        {mode !== "forgot" ? (
          <label>
            <span>パスワード</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}
        {mode === "signup" ? (
          <label>
            <span>パスワード（確認）</span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </label>
        ) : null}
        {error ? <p className="form-error" aria-live="polite">{error}</p> : null}
        {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
        <button className="maker-primary-button" type="button" disabled={isSubmitting || authMode === "blocked"} onClick={submit}>
          {isSubmitting ? "処理中…" : title}
        </button>
        <div className="auth-links">
          {mode !== "login" ? <Link href="/login">ログインへ</Link> : null}
          {mode !== "signup" ? <Link href="/signup">新規登録へ</Link> : null}
          {mode !== "forgot" ? <Link href="/forgot-password">パスワードを忘れた方</Link> : null}
        </div>
      </section>
    </main>
  );
}
