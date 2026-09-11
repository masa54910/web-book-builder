"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import StatusMessage from "@/components/ui/StatusMessage";
import { getSupabaseClient } from "@/lib/supabase/client";

type InquirySummary = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  reply_email: string;
  category: string;
  status: string;
};

type Reply = {
  id: string;
  inquiry_id: string;
  sender_type: string;
  subject: string;
  body: string;
  send_status: string;
  provider_message_id: string | null;
  sent_at: string | null;
  created_at: string;
};

type InquiryDetail = InquirySummary & {
  user_id: string | null;
  message: string;
};

const categoryLabels: Record<string, string> = {
  usage: "使い方",
  pricing: "料金・プラン",
  payment: "決済",
  book_purchase: "購入したWebブック",
  account: "アカウント",
  technical: "不具合・技術",
  other: "その他",
};

const statusLabels: Record<string, string> = {
  new: "未対応",
  in_progress: "対応中",
  resolved: "返信済み",
  spam: "スパム",
};

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString("ja-JP") : "不明";
}

function newIdempotencyKey() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [selected, setSelected] = useState<{ inquiry: InquiryDetail; replies: Reply[] } | null>(null);
  const [subject, setSubject] = useState("WebBookMaker｜お問い合わせへの返信");
  const [replyBody, setReplyBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const client = getSupabaseClient();
    const session = client ? await client.auth.getSession() : null;
    const token = session?.data.session?.access_token;
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  }, []);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await request("/api/admin/inquiries");
      const payload = await response.json().catch(() => null) as { inquiries?: InquirySummary[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "お問い合わせ一覧を読み込めませんでした。");
      setInquiries(payload?.inquiries ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "お問い合わせ一覧を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  const loadDetail = useCallback(async (id: string) => {
    setIsDetailLoading(true);
    setError("");
    try {
      const response = await request(`/api/admin/inquiries/${encodeURIComponent(id)}`);
      const payload = await response.json().catch(() => null) as { inquiry?: InquiryDetail; replies?: Reply[]; error?: string } | null;
      if (!response.ok || !payload?.inquiry) throw new Error(payload?.error || "お問い合わせ詳細を読み込めませんでした。");
      setSelected({ inquiry: payload.inquiry, replies: payload.replies ?? [] });
      setSubject(`WebBookMaker｜${categoryLabels[payload.inquiry.category] ?? "お問い合わせ"}への返信`);
      setReplyBody("");
      setMessage("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "お問い合わせ詳細を読み込めませんでした。");
    } finally {
      setIsDetailLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  const selectedId = selected?.inquiry.id ?? "";
  const selectedSummary = useMemo(() => inquiries.find((inquiry) => inquiry.id === selectedId), [inquiries, selectedId]);

  async function updateStatus(status: string) {
    if (!selected) return;
    setError("");
    try {
      const response = await request(`/api/admin/inquiries/${encodeURIComponent(selected.inquiry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "対応状況を更新できませんでした。");
      await Promise.all([loadList(), loadDetail(selected.inquiry.id)]);
      setMessage("対応状況を更新しました。");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "対応状況を更新できませんでした。");
    }
  }

  async function sendReply() {
    if (!selected || isSending || !subject.trim() || !replyBody.trim()) return;
    setIsSending(true);
    setError("");
    setMessage("");
    try {
      const response = await request(`/api/admin/inquiries/${encodeURIComponent(selected.inquiry.id)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey() },
        body: JSON.stringify({ subject, body: replyBody }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "返信を送信できませんでした。");
      await Promise.all([loadList(), loadDetail(selected.inquiry.id)]);
      setMessage("返信を送信しました。対応状況を返信済みに更新しました。");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "返信を送信できませんでした。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="admin-inquiries-page">
      <AppHeader />
      <div className="admin-inquiries-heading">
        <div>
          <p className="maker-kicker">Support operations</p>
          <HomeBackLink />
          <h1>お問い合わせ管理</h1>
          <p>問い合わせ内容を確認し、WebBookMaker名義で返信できます。</p>
        </div>
        <div className="maker-actions">
          <Button variant="secondary" href="/admin/full-design">フルデザイン運用設定</Button>
          <Button variant="secondary" href="/dashboard">作品一覧へ戻る</Button>
        </div>
      </div>

      {message ? <StatusMessage message={message} className="maker-status maker-status-success" /> : null}
      {error ? <StatusMessage message={error} className="maker-status maker-status-error" /> : null}
      {isLoading ? <LoadingState label="お問い合わせを読み込んでいます…" className="reader-loading" /> : null}

      {!isLoading && !inquiries.length ? (
        <section className="maker-card admin-inquiries-empty"><h2>お問い合わせはありません</h2><p>新しいお問い合わせが届くと、ここに表示されます。</p></section>
      ) : null}

      <div className="admin-inquiries-layout">
        <section className="maker-card admin-inquiries-list" aria-label="お問い合わせ一覧">
          <div className="admin-panel-heading"><h2>受信一覧</h2><span>{inquiries.length}件</span></div>
          {inquiries.map((inquiry) => (
            <button className={`admin-inquiry-row${inquiry.id === selectedId ? " is-selected" : ""}`} type="button" key={inquiry.id} onClick={() => void loadDetail(inquiry.id)}>
              <span className="admin-inquiry-row-main"><strong>{inquiry.name}</strong><small>{categoryLabels[inquiry.category] ?? inquiry.category} / {formatDate(inquiry.created_at)}</small></span>
              <span className={`status-pill status-${inquiry.status}`}>{statusLabels[inquiry.status] ?? inquiry.status}</span>
            </button>
          ))}
        </section>

        <section className="maker-card admin-inquiry-detail" aria-label="お問い合わせ詳細">
          {isDetailLoading ? <LoadingState label="詳細を読み込んでいます…" /> : null}
          {!isDetailLoading && !selected ? <p className="admin-detail-placeholder">一覧からお問い合わせを選択してください。</p> : null}
          {!isDetailLoading && selected ? (
            <>
              <div className="admin-panel-heading"><div><p className="maker-kicker">Inquiry detail</p><h2>{selected.inquiry.name} 様</h2></div><select aria-label="対応状況" value={selected.inquiry.status} onChange={(event) => void updateStatus(event.target.value)}><option value="new">未対応</option><option value="in_progress">対応中</option><option value="resolved">返信済み</option><option value="spam">スパム</option></select></div>
              <dl className="admin-inquiry-meta"><div><dt>受付日時</dt><dd>{formatDate(selected.inquiry.created_at)}</dd></div><div><dt>返信先</dt><dd><a href={`mailto:${selected.inquiry.reply_email}`}>{selected.inquiry.reply_email}</a></dd></div><div><dt>種別</dt><dd>{categoryLabels[selected.inquiry.category] ?? selected.inquiry.category}</dd></div></dl>
              <div className="admin-inquiry-message"><h3>お問い合わせ内容</h3><p>{selected.inquiry.message}</p></div>
              <div className="admin-reply-history"><h3>返信履歴</h3>{selected.replies.length ? selected.replies.map((reply) => <article key={reply.id} className={`admin-reply-entry admin-reply-${reply.send_status}`}><div><strong>WebBookMaker</strong><small>{formatDate(reply.sent_at || reply.created_at)} / {reply.send_status === "sent" ? "送信済み" : reply.send_status === "failed" ? "送信失敗" : "送信中"}</small></div><h4>{reply.subject}</h4><p>{reply.body}</p></article>) : <p>返信履歴はありません。</p>}</div>
              <div className="admin-reply-composer"><h3>返信する</h3><p className="admin-reply-recipient">To: {selected.inquiry.reply_email}（問い合わせから確定）</p><label><span>件名</span><input maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label><span>本文</span><textarea maxLength={5000} rows={8} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="返信内容を入力してください" /></label><Button onClick={() => void sendReply()} disabled={isSending || !subject.trim() || !replyBody.trim()} loading={isSending}>返信を送信</Button></div>
            </>
          ) : null}
        </section>
      </div>
      {selectedSummary ? <p className="admin-inquiries-updated">一覧の最終更新：{formatDate(selectedSummary.updated_at)}</p> : null}
      <Link className="maker-secondary-link" href="/contact">公開お問い合わせフォームを見る</Link>
    </main>
  );
}
