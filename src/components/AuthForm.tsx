"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import HomeBackLink from "@/components/HomeBackLink";
import PasswordInput from "@/components/ui/PasswordInput";
import StatusMessage from "@/components/ui/StatusMessage";
import TextInput from "@/components/ui/TextInput";
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
  const searchParams = useSearchParams();
  const { signIn, signUp, resetPassword, authMode, configurationError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));
  const planParam = searchParams.get("plan") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withNext = (path: string) => {
    const query = new URLSearchParams();
    if (nextPath && nextPath !== "/dashboard") query.set("next", nextPath);
    if (planParam) query.set("plan", planParam);
    const serialized = query.toString();
    return serialized ? `${path}?${serialized}` : path;
  };

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
      const planMessage = selectedPlanMessage(planParam);
      if (planMessage) {
        setMessage(planMessage);
        return;
      }
    }

    router.push(nextPath);
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
        <FormField id="auth-email" label="メールアドレス" required>
          <TextInput
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
        </FormField>
        {mode === "signup" ? (
          <FormField id="auth-display-name" label="表示名">
            <TextInput id="auth-display-name" value={displayName} onChange={setDisplayName} />
          </FormField>
        ) : null}
        {mode !== "forgot" ? (
          <FormField id="auth-password" label="パスワード" required>
            <PasswordInput
              id="auth-password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={setPassword}
            />
          </FormField>
        ) : null}
        {mode === "signup" ? (
          <FormField id="auth-password-confirm" label="パスワード（確認）" required>
            <PasswordInput
              id="auth-password-confirm"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
            />
          </FormField>
        ) : null}
        {error ? <StatusMessage variant="error" message={error} ariaLive="assertive" className="form-error" /> : null}
        {message ? <StatusMessage variant="success" message={message} /> : null}
        <Button variant="primary" fullWidth loading={isSubmitting} disabled={authMode === "blocked"} onClick={submit}>
          {title}
        </Button>
        <div className="auth-links">
          {mode !== "login" ? <Link href={withNext("/login")}>ログインへ</Link> : null}
          {mode !== "signup" ? <Link href={withNext("/signup")}>新規登録へ</Link> : null}
          {mode !== "forgot" ? <Link href={withNext("/forgot-password")}>パスワードを忘れた方</Link> : null}
        </div>
      </section>
    </main>
  );
}
