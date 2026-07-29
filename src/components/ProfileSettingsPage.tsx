"use client";

import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth/AuthContext";
import { getOwnProfile, saveOwnProfile, type ProfileRecord } from "@/lib/profileRepository";
import { normalizeHandle } from "@/lib/productTypes";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getOwnProfile(user.id, user.email)
      .then(setProfile)
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。"),
      );
  }, [user]);

  const update = <K extends keyof ProfileRecord>(key: K, value: ProfileRecord[K]) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const next = await saveOwnProfile(profile);
      setProfile(next);
      setMessage("プロフィールを保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "プロフィール保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="dashboard-page">
      <AppHeader />
      <section className="maker-card">
        <p className="maker-kicker">Account</p>
        <h1>プロフィール設定</h1>
        <p>
          作者ページに表示する情報を設定します。ハンドルを変更すると作者ページURLも変わります。
        </p>
        {!profile ? (
          <div className="reader-loading">プロフィールを読み込んでいます…</div>
        ) : (
          <>
            <div className="maker-grid">
              <label>
                <span>表示名</span>
                <input value={profile.displayName} onChange={(event) => update("displayName", event.target.value)} />
              </label>
              <label>
                <span>作者ハンドル</span>
                <input value={profile.handle} onChange={(event) => update("handle", normalizeHandle(event.target.value, ""))} />
              </label>
              <label>
                <span>Webサイト</span>
                <input value={profile.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://example.com" />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={profile.isPublic} onChange={(event) => update("isPublic", event.target.checked)} />
                <span>作者ページを公開する</span>
              </label>
            </div>
            <label className="maker-full">
              <span>自己紹介</span>
              <textarea rows={4} value={profile.bio} onChange={(event) => update("bio", event.target.value)} />
            </label>
            <div className="maker-actions">
              <button className="maker-primary-button" type="button" disabled={isSaving} onClick={() => void save()}>
                {isSaving ? "保存中…" : "プロフィールを保存"}
              </button>
            </div>
          </>
        )}
        {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
      </section>
      <section className="maker-card">
        <h2>限定ベータ中のお願い</h2>
        <ul className="beta-notes">
          <li>重要な原稿は必ず手元にも保存してください。</li>
          <li>不具合・要望はフッターまたはダッシュボードのフィードバック導線から送ってください。</li>
          <li>データ削除依頼・問い合わせ先は限定ベータ案内文書に記載します。</li>
        </ul>
      </section>
    </main>
  );
}
