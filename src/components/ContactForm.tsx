"use client";

import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const categoryOptions = [
  ["usage", "WebBookMakerの使い方"],
  ["pricing", "料金・プラン"],
  ["payment", "決済について"],
  ["book_purchase", "購入したWebブックについて"],
  ["account", "アカウントについて"],
  ["technical", "不具合・技術的な問題"],
  ["other", "その他"],
] as const;

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const client = getSupabaseClient();
    const session = client ? await client.auth.getSession() : null;
    const token = session?.data.session?.access_token;
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        name: data.get("name"),
        replyEmail: data.get("replyEmail"),
        category: data.get("category"),
        message: data.get("message"),
        website: data.get("website"),
      }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setStatus({ type: "error", text: result.error || "お問い合わせを送信できませんでした。" });
      return;
    }
    form.reset();
    setStatus({ type: "success", text: "お問い合わせを受け付けました。" });
  }

  return (
    <form className="contact-form" onSubmit={(event) => void submit(event)}>
      <p>ご質問や不具合のご連絡を、こちらのフォームからお送りください。</p>
      <label><span>お名前</span><input name="name" required maxLength={120} autoComplete="name" /></label>
      <label><span>返信先メールアドレス</span><input name="replyEmail" required maxLength={254} type="email" autoComplete="email" /></label>
      <label><span>お問い合わせ種別</span><select name="category" defaultValue="usage" required>{categoryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>お問い合わせ内容</span><textarea name="message" required maxLength={5000} rows={7} /></label>
      <label className="contact-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="maker-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "送信しています…" : "お問い合わせを送信"}</button>
      {status ? <p className={status.type === "success" ? "contact-status contact-status-success" : "contact-status contact-status-error"} role="status">{status.text}</p> : null}
    </form>
  );
}
