"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/dashboard";
  return value;
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
    router.push(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/" aria-label="WebBookMaker ホーム">
          <span className="auth-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 96 82">
              <defs>
                <linearGradient id="authTabletFrame" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#183f36" />
                  <stop offset="1" stopColor="#0f6f5d" />
                </linearGradient>
                <linearGradient id="authBookPaper" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fffdf7" />
                  <stop offset="1" stopColor="#f5ead6" />
                </linearGradient>
              </defs>
              <ellipse cx="45" cy="75" rx="37" ry="5" fill="#d9c7a8" opacity=".28" />
              <path d="M66 15 87 72H67Z" fill="#17483c" opacity=".95" />
              <g transform="rotate(-4 45 39)">
                <rect x="9" y="8" width="66" height="61" rx="9" fill="url(#authTabletFrame)" />
                <rect x="15" y="14" width="54" height="49" rx="5" fill="#f9f4e9" />
                <circle cx="42" cy="11" r="1.3" fill="#8cb0a4" />
              </g>
              <g transform="translate(18 20)">
                <path d="M2 5c10-2 18 0 25 6v35c-7-5-15-7-25-5Z" fill="url(#authBookPaper)" stroke="#ead9bd" strokeWidth="1.4" />
                <path d="M52 5c-10-2-18 0-25 6v35c7-5 15-7 25-5Z" fill="url(#authBookPaper)" stroke="#ead9bd" strokeWidth="1.4" />
                <path d="M27 11v35" stroke="#dfcba8" strokeWidth="1.4" />
                <path d="M10 17h11M10 23h12M10 29h10M34 17h10M34 23h12M34 29h9" stroke="#d9c6a5" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M13 4h9v15l-4.5-3-4.5 3Z" fill="#ef8b3d" />
              </g>
            </svg>
          </span>
          <span className="auth-brand-copy">
            <strong>WebBookMaker</strong>
            <small>あなたの文章を、そのままWeb書籍に。</small>
          </span>
        </Link>
        <Link className="auth-home-link" href="/">
          ← ホームへ戻る
        </Link>
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
