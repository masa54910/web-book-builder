"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import { ShioriDesignInterview } from "@/components/ShioriDesignInterview";
import { fullDesignRequest } from "@/lib/fullDesignClient";
import { buildFullDesignProfile, parseFullDesignBrief } from "@/lib/fullDesignContract";
import { myDesignFromResult, type MyDesign } from "@/lib/myDesigns";
import type { FullDesignResult } from "@/lib/fullDesignPipeline";
import type { ShioriDesignBrief } from "@/lib/shioriDesignBrief";
import { runRuleBasedLayoutCritic } from "@/lib/layoutCritic";
import type { BookContentBlock } from "@/lib/bookProject";

type Props = {
  identity: string; bookId?: string; locked: boolean; profile: unknown; blocks: BookContentBlock[];
  onPreview: (result: FullDesignResult | null) => void;
  onApply: (result: FullDesignResult, brief: ShioriDesignBrief) => void;
  onFullPreview: (result: FullDesignResult) => void;
};
function subscribeToBriefStorage(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
function restoredBrief(raw: string | null) {
  try { return raw ? parseFullDesignBrief(JSON.parse(raw)) : null; } catch { return null; }
}
export default function FullDesignPanel({ identity, bookId, locked, profile, blocks, onPreview, onApply, onFullPreview }: Props) {
  const key = `webbookmaker:full-design-brief:v1:${identity}`;
  const readStorage = useCallback(() => {
    try { return localStorage.getItem(key); } catch { return null; }
  }, [key]);
  const persisted = useSyncExternalStore(subscribeToBriefStorage, readStorage, () => null);
  const [currentBrief, setBrief] = useState<ShioriDesignBrief | null>(null);
  const brief = currentBrief || restoredBrief(persisted);
  const [interview, setInterview] = useState(false);
  const [result, setResult] = useState<FullDesignResult | null>(null);
  const [designs, setDesigns] = useState<MyDesign[] | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abort.current?.abort();
  }, []);
  const remember = (next: ShioriDesignBrief) => {
    setBrief(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const critic = runRuleBasedLayoutCritic(blocks);
  const execute = async (task: () => Promise<void>) => {
    if (inFlight.current || locked) return;
    inFlight.current = true; setBusy(true); setMessage("");
    try { await task(); } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setMessage(error instanceof Error ? error.message : "処理を完了できませんでした。");
    } finally { inFlight.current = false; setBusy(false); }
  };
  const generate = (next: ShioriDesignBrief) => void execute(async () => {
    remember(next); setInterview(false);
    abort.current = new AbortController();
    const generated = await fullDesignRequest("/api/ai/book-designer/full", "POST", {
      brief: next, bookId: bookId || null, bookProfile: buildFullDesignProfile(profile),
    }, abort.current.signal) as FullDesignResult;
    const grammar = myDesignFromResult(next, generated);
    if (!grammar) throw new Error("生成されたデザインを検証できませんでした。");
    setResult({ ...generated, spec: grammar.spec }); onPreview({ ...generated, spec: grammar.spec });
    setName(generated.selectedDesignSystemName);
  });
  const reloadDesigns = async () => {
    const payload = await fullDesignRequest("/api/my-designs");
    setDesigns(payload.designs);
  };
  return <section className="full-design-panel" aria-labelledby="full-design-heading">
    <h3 id="full-design-heading">しおりちゃんとデザインする</h3>
    <p className="maker-note">質問から本全体のデザイン方針を作成します。原稿・画像・販売設定は変更しません。</p>
    <div className="maker-actions">
      <Button type="button" variant="secondary" disabled={busy || locked} onClick={() => setInterview(true)}>しおりちゃんと新しく決める</Button>
      <Button type="button" variant="secondary" disabled={busy || locked} onClick={() => void execute(reloadDesigns)}>保存したデザインを使う</Button>
    </div>
    {interview ? <ShioriDesignInterview initialBrief={brief} onCancel={() => setInterview(false)} onConfirm={generate} /> : null}
    {busy ? <p role="status">デザインを準備しています…</p> : null}
    {result && brief ? <div className="shiori-brief-saved">
      <strong>{result.mode === "api-on" ? "AIフルデザイン" : result.mode === "my-design" ? "マイデザイン" : "しおりちゃん自動デザイン"} · {result.selectedDesignSystemName}</strong>
      <p>安全判定を通した表示で確認してください。まだ原稿の保存状態には適用していません。</p>
      {critic.issues.length ? <ul>{critic.issues.map((issue, index) => <li key={`${issue.blockId}-${index}`}>{issue.message}</li>)}</ul> : null}
      <div className="maker-actions">
        <Button type="button" disabled={locked || busy} onClick={() => onFullPreview(result)}>Full Preview</Button>
        <Button type="button" disabled={locked || busy} onClick={() => { onApply(result, brief); setResult(null); setMessage("デザインを適用しました。履歴から以前のデザインへ戻せます。"); }}>このデザインを使う</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => { setResult(null); onPreview(null); }}>元に戻す</Button>
        <Button type="button" variant="secondary" disabled={locked || busy} onClick={() => generate(brief)}>もう一案つくる</Button>
      </div>
      <label>デザイン名<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <Button type="button" variant="secondary" disabled={locked || busy || !name.trim()} onClick={() => void execute(async () => {
        await fullDesignRequest("/api/my-designs", "POST", { name, grammar: myDesignFromResult(brief, result) });
        setMessage("マイデザインに保存しました。別の作品でも利用できます。"); await reloadDesigns();
      })}>このデザイン方針を保存</Button>
    </div> : null}
    {designs ? <ul>{designs.map((design) => <li key={design.id}>
      <span>{design.name}</span>
      <Button size="sm" variant="secondary" type="button" disabled={busy || locked} onClick={() => void execute(async () => {
        const reused = await fullDesignRequest("/api/ai/book-designer/full", "POST", { myDesignId: design.id, bookId: bookId || null });
        const checkedBrief = parseFullDesignBrief(reused.brief);
        if (!checkedBrief || !myDesignFromResult(checkedBrief, reused)) throw new Error("デザインを検証できませんでした。");
        remember(checkedBrief); setResult(reused); onPreview(reused); setName(design.name);
      })}>この方針を使う</Button>
      <Button size="sm" variant="secondary" type="button" disabled={busy || locked} onClick={() => {
        const renamed = window.prompt("新しいデザイン名", design.name);
        if (renamed?.trim()) void execute(async () => { await fullDesignRequest("/api/my-designs", "PATCH", { id: design.id, name: renamed }); await reloadDesigns(); });
      }}>名前変更</Button>
      <Button size="sm" variant="danger" type="button" disabled={busy || locked} onClick={() => {
        if (window.confirm("このマイデザインを削除しますか？作品本文は削除されません。")) void execute(async () => { await fullDesignRequest("/api/my-designs", "DELETE", { id: design.id }); await reloadDesigns(); });
      }}>削除</Button>
    </li>)}</ul> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
