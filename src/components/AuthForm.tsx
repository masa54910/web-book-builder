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
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";
import LanguageSelector from "@/components/LanguageSelector";

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/dashboard";
  return value;
}

export default function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, resetPassword, authMode, configurationError } = useAuth();
  const { locale } = useUiLocale();
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

  const title = mode === "login" ? uiT(locale, "auth.login") : mode === "signup" ? uiT(locale, "auth.signup") : uiT(locale, "auth.forgotPassword");

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
      setError(locale === "en" ? "Enter your email address." : "メールアドレスを入力してください。");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError(locale === "en" ? "Password must be at least 8 characters." : "パスワードは8文字以上で入力してください。");
      return;
    }
    if (mode === "signup" && !passwordConfirm.trim()) {
      setError(locale === "en" ? "Confirm your password." : "パスワード（確認）を入力してください。");
      return;
    }
    if (mode === "signup" && password !== passwordConfirm) {
      setError(locale === "en" ? "Passwords do not match." : "パスワードが一致しません。");
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
      setMessage(forgotResult.message ?? (locale === "en" ? "Reset instructions have been sent." : "再設定手順を送信しました。"));
      return;
    }

    if (planParam === "publish" || planParam === "writer") {
      router.push(`/billing/start?plan=${encodeURIComponent(planParam)}`);
    } else {
      router.push(nextPath);
    }
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
        <div className="auth-locale"><LanguageSelector /></div>
        <h1>{title}</h1>
        {authMode === "demo" ? (
            <p className="auth-notice">
            {locale === "en" ? "Local demo authentication is active because Supabase is not configured. Production uses Supabase Auth." : "Supabase環境変数が未設定のため、ローカルデモ認証で動作しています。本番ではSupabase Authへ切り替わります。"}
          </p>
        ) : null}
        {authMode === "blocked" ? (
          <p className="form-error" aria-live="polite">
            {locale === "en" ? "Login is temporarily unavailable. Please try again later." : "現在ログイン機能を利用できません。しばらくしてから再度お試しください。"}
          </p>
        ) : null}
        <FormField id="auth-email" label={uiT(locale, "auth.email")} required>
          <TextInput
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
        </FormField>
        {mode === "signup" ? (
          <FormField id="auth-display-name" label={uiT(locale, "auth.displayName")}>
            <TextInput id="auth-display-name" value={displayName} onChange={setDisplayName} />
          </FormField>
        ) : null}
        {mode !== "forgot" ? (
          <FormField id="auth-password" label={uiT(locale, "auth.password")} required>
            <PasswordInput
              id="auth-password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={setPassword}
            />
          </FormField>
        ) : null}
        {mode === "signup" ? (
          <FormField id="auth-password-confirm" label={uiT(locale, "auth.passwordConfirm")} required>
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
        {mode === "signup" ? (
          <p className="auth-consent">
            {locale === "en" ? <>By creating an account, you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</> : <>会員登録を行うことで、<Link href="/terms">利用規約</Link>および<Link href="/privacy">プライバシーポリシー</Link>に同意したものとみなします。</>}
          </p>
        ) : null}
        <Button variant="primary" fullWidth loading={isSubmitting} disabled={authMode === "blocked"} onClick={submit}>
          {title}
        </Button>
        <div className="auth-links">
          {mode !== "login" ? <Link href={withNext("/login")}>{locale === "en" ? "Back to log in" : "ログインへ"}</Link> : null}
          {mode !== "signup" ? <Link href={withNext("/signup")}>{locale === "en" ? "Create an account" : "新規登録へ"}</Link> : null}
          {mode !== "forgot" ? <Link href={withNext("/forgot-password")}>{locale === "en" ? "Forgot your password?" : "パスワードを忘れた方"}</Link> : null}
        </div>
      </section>
    </main>
  );
}
