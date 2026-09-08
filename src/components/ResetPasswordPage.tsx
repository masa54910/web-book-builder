"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import HomeBackLink from "@/components/HomeBackLink";
import PasswordInput from "@/components/ui/PasswordInput";
import StatusMessage from "@/components/ui/StatusMessage";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { resolveSafeInternalReturnPath } from "@/lib/returnTo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authMode, isLoading, user, updatePassword } = useAuth();
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = resolveSafeInternalReturnPath(searchParams.get("next") ?? "", "/login");

  useEffect(() => {
    if (isLoading || user || authMode === "blocked") return;
    setError("パスワード再設定の認証状態を確認できません。メール内のリンクを開き直してください。");
  }, [authMode, isLoading, user]);

  const submit = async () => {
    if (isSubmitting || isLoading || !user) return;
    setError("");
    setMessage("");
    if (nextPassword.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください。");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません。");
      return;
    }
    setIsSubmitting(true);
    const result = await updatePassword(nextPassword);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNextPassword("");
    setConfirmPassword("");
    setMessage(result.message ?? "パスワードを変更しました。");
    window.setTimeout(() => router.replace(nextPath), 700);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <HomeBackLink className="auth-home-link" />
        <h1>新しいパスワード</h1>
        <p>新しいパスワードを入力してください。</p>
        <label>
          <span>新しいパスワード</span>
          <PasswordInput id="reset-password" autoComplete="new-password" value={nextPassword} onChange={setNextPassword} />
        </label>
        <label>
          <span>新しいパスワード（確認）</span>
          <PasswordInput id="reset-password-confirm" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
        </label>
        {error ? <StatusMessage variant="error" message={error} className="form-error" /> : null}
        {message ? <StatusMessage variant="success" message={message} /> : null}
        <Button variant="primary" fullWidth loading={isSubmitting} disabled={isLoading || !user || authMode === "blocked"} onClick={() => void submit()}>
          パスワードを変更
        </Button>
        <Link className="maker-secondary-link" href="/login">ログイン画面へ</Link>
      </section>
    </main>
  );
}
