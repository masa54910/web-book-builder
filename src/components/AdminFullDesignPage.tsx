"use client";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import { fullDesignRequest } from "@/lib/fullDesignClient";

type AdminData = {
  apiEnabled: boolean;
  limits: Array<{ plan_code: string; daily_limit: number | null }>;
  runs: Array<{ id: string; mode: string; plan_code: string; status: string; model: string | null; input_tokens: number; output_tokens: number; cached_tokens: number; latency_ms: number; created_at: string }>;
};
export default function AdminFullDesignPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fullDesignRequest("/api/admin/full-design", "GET", undefined, abort.signal).then(setData).catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => abort.abort();
  }, []);
  const toggle = async (enabled: boolean) => {
    setBusy(true); setError("");
    try {
      await fullDesignRequest("/api/admin/full-design", "PATCH", { apiEnabled: enabled });
      setData(await fullDesignRequest("/api/admin/full-design"));
    } catch (e) { setError(e instanceof Error ? e.message : "設定を変更できませんでした。"); }
    finally { setBusy(false); }
  };
  return <><AppHeader /><main className="maker-shell">
    <HomeBackLink destination="dashboard" />
    <h1>AI Full Design 管理</h1>
    {error ? <p role="alert">{error}</p> : null}
    {data ? <>
      <h2>AI Full Design API：{data.apiEnabled ? "ON" : "OFF"}</h2>
      <p>ON：GPT-5.4でBase選択・必要な差分を生成。OFF：しおりちゃん自動デザイン。OpenAI呼び出しなし。</p>
      <div className="maker-actions">
        <Button type="button" disabled={busy || data.apiEnabled} onClick={() => void toggle(true)}>ON</Button>
        <Button type="button" variant="secondary" disabled={busy || !data.apiEnabled} onClick={() => void toggle(false)}>OFF</Button>
      </div>
      <h2>Full Design利用枠</h2>
      <p>Quick Designとは独立しています。正式回数は未確定です。未設定のプランはGPT生成を許可しません。</p>
      <ul>{data.limits.map((limit) => <li key={limit.plan_code}>{limit.plan_code}：{limit.daily_limit ?? "未設定"}</li>)}</ul>
      <h2>直近50回の計測</h2>
      <div style={{ overflowX: "auto" }}><table><thead><tr>{["日時", "mode", "plan", "status", "model", "input", "output", "cached", "ms"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{data.runs.map((run) => <tr key={run.id}><td>{new Date(run.created_at).toLocaleString("ja-JP")}</td><td>{run.mode}</td><td>{run.plan_code}</td><td>{run.status}</td><td>{run.model || "—"}</td><td>{run.input_tokens}</td><td>{run.output_tokens}</td><td>{run.cached_tokens}</td><td>{run.latency_ms}</td></tr>)}</tbody>
      </table></div>
    </> : !error ? <p role="status">管理者権限と設定を確認しています…</p> : null}
  </main></>;
}
