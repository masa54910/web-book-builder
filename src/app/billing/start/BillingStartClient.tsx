"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
type Book = { id: string; title: string; status: string; slug: string };
export default function BillingStartClient() {
  const requestedPlan = useSearchParams().get("plan");
  const plan = requestedPlan === "operation_standard"
    ? "operation_standard"
    : requestedPlan === "operation_plus" || requestedPlan === "writer"
      ? "operation"
      : "publication";
  const [books, setBooks] = useState<Book[]>([]); const [bookId, setBookId] = useState(""); const [message, setMessage] = useState("作品一覧を読み込んでいます…");
  useEffect(() => { const client = getSupabaseClient(); void (async () => { const session = client ? await client.auth.getSession() : null; const token = session?.data.session?.access_token; if (!token) { setMessage("ログインが必要です。"); return; } const response = await fetch("/api/billing/books", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const result = await response.json() as { books?: Book[]; error?: string }; if (!response.ok) { setMessage(result.error || "作品一覧を取得できませんでした。"); return; } setBooks(result.books || []); setBookId(result.books?.[0]?.id || ""); setMessage(""); })(); }, []);
  const begin = async () => { const client = getSupabaseClient(); const session = client ? await client.auth.getSession() : null; const token = session?.data.session?.access_token; if (!token) { setMessage("ログインが必要です。"); return; } setMessage("Checkoutを準備しています…"); const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ plan, ...(plan === "publication" ? { bookId } : {}) }) }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) { setMessage(result.error || "決済を開始できませんでした。"); return; } window.location.assign(result.url); };
  const isPublication = plan === "publication";
  const isStandard = plan === "operation_standard";
  return <main className="auth-page"><section className="auth-card"><h1>{isPublication ? "出版プラン" : isStandard ? "運用プラン スタンダード" : "運用プラン プラス"}</h1><p>{isPublication ? "公開する作品を選択してください。" : "公開後も作品を継続運用できます。"}</p>{isPublication ? <label className="form-field"><span>作品</span><select value={bookId} onChange={(event) => setBookId(event.target.value)}>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label> : null}<div className="checkout-disclosure"><strong>お申し込み前の確認</strong><ul>{isPublication ? <><li>¥980（税込）／1冊分の公開枠・買い切りです。</li><li>決済確認後、選択した作品を公開します。</li><li>作品販売機能は含まれません。</li></> : isStandard ? <><li>¥980（税込）／月・1冊分の公開枠です。</li><li>作品販売機能を利用できます。</li><li>解約は「プランを管理」からいつでも行えます。</li></> : <><li>¥1,980（税込）／月・10冊分の公開枠です。</li><li>作品販売機能を利用できます。</li><li>解約は「プランを管理」からいつでも行えます。</li></>}</ul></div>{message ? <p className="form-error" aria-live="polite">{message}</p> : null}<button className="maker-primary-button" type="button" disabled={isPublication && !bookId} onClick={() => void begin()}>Stripe Checkoutへ進む</button></section></main>;
}
