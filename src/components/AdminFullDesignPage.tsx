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
  users: Array<{ id: string; email: string | null; qa: { isEnabled: boolean; allowPublish: boolean; publicationLimit: number | null; allowFullDesign: boolean; allowAICritic: boolean; expiresAt: string | null } | null }>;
};
export default function AdminFullDesignPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qaUserId, setQaUserId] = useState("");
  const [qaForm, setQaForm] = useState({ isEnabled: false, allowPublish: false, allowFullDesign: false, allowAICritic: false, publicationLimit: 1, expiresAt: "" });
  const loadData = async () => {
    const [full, qa] = await Promise.all([fullDesignRequest("/api/admin/full-design"), fullDesignRequest("/api/admin/qa-entitlements")]);
    setData({ ...full, users: qa.users });
  };
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([fullDesignRequest("/api/admin/full-design", "GET", undefined, abort.signal), fullDesignRequest("/api/admin/qa-entitlements", "GET", undefined, abort.signal)]).then(([full, qa]) => setData({ ...full, users: qa.users })).catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => abort.abort();
  }, []);
  const toggle = async (enabled: boolean) => {
    setBusy(true); setError("");
    try {
      await fullDesignRequest("/api/admin/full-design", "PATCH", { apiEnabled: enabled });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "設定を変更できませんでした。"); }
    finally { setBusy(false); }
  };
  const selectQAUser = (userId: string) => {
    setQaUserId(userId);
    const qa = data?.users.find((user) => user.id === userId)?.qa;
    setQaForm({ isEnabled: qa?.isEnabled ?? false, allowPublish: qa?.allowPublish ?? false, allowFullDesign: qa?.allowFullDesign ?? false, allowAICritic: qa?.allowAICritic ?? false, publicationLimit: qa?.publicationLimit ?? 1, expiresAt: qa?.expiresAt ? qa.expiresAt.slice(0, 16) : "" });
  };
  const saveQA = async () => {
    if (!qaUserId) return;
    setBusy(true); setError("");
    try { await fullDesignRequest("/api/admin/qa-entitlements", "PATCH", { userId: qaUserId, ...qaForm, publicationLimit: Number(qaForm.publicationLimit), expiresAt: qaForm.expiresAt ? new Date(qaForm.expiresAt).toISOString() : null }); await loadData(); }
    catch (e) { setError(e instanceof Error ? e.message : "QA権限を変更できませんでした。"); }
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
      <h2>QAテストアカウント</h2>
      <p>通常Plan・Stripe・既存Quotaとは分離された、期限付きの管理者専用QA権限です。</p>
      <label className="form-field"><span>対象ユーザー</span><select value={qaUserId} onChange={(event) => selectQAUser(event.target.value)}><option value="">選択してください</option>{data.users.map((user) => <option key={user.id} value={user.id}>{user.email || user.id}</option>)}</select></label>
      {qaUserId ? <>
        <label className="checkbox-label"><input type="checkbox" checked={qaForm.isEnabled} onChange={(event) => setQaForm({ ...qaForm, isEnabled: event.target.checked })} /><span>QA Mode ON</span></label>
        <label className="checkbox-label"><input type="checkbox" checked={qaForm.allowPublish} onChange={(event) => setQaForm({ ...qaForm, allowPublish: event.target.checked })} /><span>Publish（公開枠）</span></label>
        <label className="checkbox-label"><input type="checkbox" checked={qaForm.allowFullDesign} onChange={(event) => setQaForm({ ...qaForm, allowFullDesign: event.target.checked })} /><span>Full Design</span></label>
        <label className="checkbox-label"><input type="checkbox" checked={qaForm.allowAICritic} onChange={(event) => setQaForm({ ...qaForm, allowAICritic: event.target.checked })} /><span>AI Critic</span></label>
        <label className="form-field"><span>公開枠</span><input type="number" min={1} max={10} value={qaForm.publicationLimit} onChange={(event) => setQaForm({ ...qaForm, publicationLimit: Number(event.target.value) })} /></label>
        <label className="form-field"><span>有効期限（必須）</span><input type="datetime-local" value={qaForm.expiresAt} onChange={(event) => setQaForm({ ...qaForm, expiresAt: event.target.value })} /></label>
        <Button type="button" disabled={busy} onClick={() => void saveQA()}>QA権限を保存</Button>
      </> : null}
      <h2>直近50回の計測</h2>
      <div style={{ overflowX: "auto" }}><table><thead><tr>{["日時", "mode", "plan", "status", "model", "input", "output", "cached", "ms"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{data.runs.map((run) => <tr key={run.id}><td>{new Date(run.created_at).toLocaleString("ja-JP")}</td><td>{run.mode}</td><td>{run.plan_code}</td><td>{run.status}</td><td>{run.model || "—"}</td><td>{run.input_tokens}</td><td>{run.output_tokens}</td><td>{run.cached_tokens}</td><td>{run.latency_ms}</td></tr>)}</tbody>
      </table></div>
    </> : !error ? <p role="status">管理者権限と設定を確認しています…</p> : null}
  </main></>;
}
