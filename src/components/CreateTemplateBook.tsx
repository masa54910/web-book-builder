"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import TextInput from "@/components/ui/TextInput";
import GlassCard from "@/components/ui/GlassCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { assertBookCreationAvailable } from "@/lib/bookRepository";
import { saveCanonicalBookCommand } from "@/lib/commands/canonicalBookCommands";
import type { CanonicalBookPayload } from "@/lib/canonicalBook";
import styles from "./TemplateCatalog.module.css";

export default function CreateTemplateBook({ templateId, name }: { templateId: string; name: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState(name);
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const createdId = useRef<string | null>(null);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !user) return;
    if (createdId.current) { router.replace(`/dashboard/books/${createdId.current}/edit`); return; }
    if (!title.trim() || !author.trim()) { setMessage("タイトルと著者名を入力してください。"); return; }
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      await assertBookCreationAvailable(user.id);
      const supabase = getSupabaseClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("session-required");
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(response.status === 409 ? "上限に達しています" : "template-unavailable");
      const { payload } = await response.json() as { payload: CanonicalBookPayload };
      const result = await saveCanonicalBookCommand({ ...payload, title: title.trim(), authorName: author.trim() }, user.id);
      createdId.current = result.bookId;
      router.replace(`/dashboard/books/${result.bookId}/edit`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setMessage(/作成できる作品数|作成上限|冊数|上限に達|最大.*作品まで/.test(reason) ? "作成できる作品数の上限に達しています。マイライブラリでご確認ください。" : "作品を作成できませんでした。マイライブラリに作成済みの作品がないか確認してから、再度お試しください。");
      inFlight.current = false;
      setBusy(false);
    }
  }
  return <GlassCard className={styles.create} padding="lg"><h1>{name}</h1><p>文章と画像を自由に差し替えられる、非公開の新しい作品を作成します。</p><form onSubmit={create}><FormField id="template-book-title" label="タイトル" required><TextInput id="template-book-title" value={title} onChange={setTitle} maxLength={120} disabled={busy} /></FormField><FormField id="template-book-author" label="著者名" required><TextInput id="template-book-author" value={author} onChange={setAuthor} maxLength={80} disabled={busy} /></FormField><p role="status">{message}</p><Button type="submit" loading={busy}>作品を作成して編集する</Button><Button href="/dashboard" variant="secondary">マイライブラリへ</Button></form></GlassCard>;
}
