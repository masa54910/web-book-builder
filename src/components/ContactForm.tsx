"use client";

import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";

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
  const { locale } = useUiLocale();
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
      setStatus({ type: "error", text: locale === "en" ? uiT(locale, "contact.error") : (result.error || uiT(locale, "contact.error")) });
      return;
    }
    form.reset();
    setStatus({ type: "success", text: uiT(locale, "contact.success") });
  }

  return (
    <form className="contact-form" onSubmit={(event) => void submit(event)}>
      <p>{uiT(locale, "contact.description")}</p>
      <label><span>{uiT(locale, "contact.name")}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
      <label><span>{uiT(locale, "contact.replyEmail")}</span><input name="replyEmail" required maxLength={254} type="email" autoComplete="email" /></label>
      <label><span>{uiT(locale, "contact.category")}</span><select name="category" defaultValue="usage" required>{categoryOptions.map(([value, label]) => <option value={value} key={value}>{locale === "en" ? ({ usage: "Using WebBookMaker", pricing: "Pricing and plans", payment: "Payments", book_purchase: "A purchased web book", account: "Account", technical: "Bug or technical issue", other: "Other" } as Record<string, string>)[value] : label}</option>)}</select></label>
      <label><span>{uiT(locale, "contact.message")}</span><textarea name="message" required maxLength={5000} rows={7} /></label>
      <label className="contact-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="maker-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? uiT(locale, "contact.sending") : uiT(locale, "contact.send")}</button>
      {status ? <p className={status.type === "success" ? "contact-status contact-status-success" : "contact-status contact-status-error"} role="status">{status.text}</p> : null}
    </form>
  );
}
