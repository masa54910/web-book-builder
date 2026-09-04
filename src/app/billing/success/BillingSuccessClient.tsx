"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function BillingSuccessClient() {
  const sessionId = useSearchParams().get("session_id") || "";
  const [message, setMessage] = useState("お支払いを確認しています…");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const client = getSupabaseClient();
      const session = client ? await client.auth.getSession() : null;
      const token = session?.data.session?.access_token;
      if (!token || !sessionId) { if (active) setMessage("ログイン状態または決済情報を確認できませんでした。"); return; }
      const response = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ session_id: sessionId }), cache: "no-store" });
      if (!active) return;
      if (!response.ok) { setMessage("お支払いを確認できませんでした。"); return; }
      setOk(true); setMessage("お支払いを確認しました。プランが有効になりました。");
    })();
    return () => { active = false; };
  }, [sessionId]);
  return <main className="purchase-page"><section className="purchase-card"><div className="purchase-content"><h1>{ok ? "購入ありがとうございます" : "決済確認"}</h1><p>{message}</p>{ok ? <Link className="purchase-button purchase-button-primary" href="/dashboard">ダッシュボードへ</Link> : <Link className="purchase-button purchase-button-secondary" href="/pricing">料金プランへ戻る</Link>}</div></section></main>;
}
