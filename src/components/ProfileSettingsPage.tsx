"use client";

import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import {
  getOwnAuthorLinks,
  getOwnProfilePreferences,
  saveOwnAuthorLinks,
  saveOwnProfilePreferences,
  type AuthorLinkRecord,
  type ProfilePreferences,
} from "@/lib/accountSettingsRepository";
import { useAuth } from "@/lib/auth/AuthContext";
import { getOwnProfile, saveOwnProfile, type ProfileRecord } from "@/lib/profileRepository";
import { normalizeHandle } from "@/lib/productTypes";

function socialValue(links: AuthorLinkRecord[], type: AuthorLinkRecord["linkType"]) {
  return links.find((link) => link.linkType === type)?.url || "";
}

function buildSocialLinks(xUrl: string, noteUrl: string, otherUrl: string) {
  const links: AuthorLinkRecord[] = [];
  if (xUrl.trim()) {
    links.push({ id: "x", label: "X", url: xUrl, linkType: "x" });
  }
  if (noteUrl.trim()) {
    links.push({ id: "note", label: "note", url: noteUrl, linkType: "note" });
  }
  if (otherUrl.trim()) {
    links.push({ id: "other", label: "Webサイト", url: otherUrl, linkType: "other" });
  }
  return links;
}

export default function ProfileSettingsPage() {
  const { user, signOut, changePassword, deleteAccount } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    emailNotifications: true,
    campaignNotifications: false,
  });
  const [xUrl, setXUrl] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [otherUrl, setOtherUrl] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getOwnProfile(user.id, user.email),
      getOwnAuthorLinks(user.id),
      getOwnProfilePreferences(user.id),
    ])
      .then(([loadedProfile, links, loadedPreferences]) => {
        setProfile(loadedProfile);
        setXUrl(socialValue(links, "x"));
        setNoteUrl(socialValue(links, "note"));
        setOtherUrl(socialValue(links, "other") || socialValue(links, "website"));
        setPreferences(loadedPreferences);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。");
      });
  }, [user]);

  const update = <K extends keyof ProfileRecord>(key: K, value: ProfileRecord[K]) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async () => {
    if (!profile || !user) return;
    setErrorMessage("");
    setMessage("");
    setIsSaving(true);
    try {
      const next = await saveOwnProfile(profile);
      const socialLinks = buildSocialLinks(xUrl, noteUrl, otherUrl);
      await saveOwnAuthorLinks(user.id, socialLinks);
      await saveOwnProfilePreferences(user.id, preferences);
      setProfile(next);
      setMessage("登録情報を保存しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登録情報の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !nextPassword || !confirmPassword) {
      setErrorMessage("パスワード変更に必要な項目を入力してください。");
      return;
    }
    if (nextPassword.length < 8) {
      setErrorMessage("新しいパスワードは8文字以上で入力してください。");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setErrorMessage("新しいパスワードが一致しません。");
      return;
    }
    setErrorMessage("");
    setMessage("");
    setIsChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, nextPassword);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setMessage(result.message || "パスワードを更新しました。");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmText !== "削除します") {
      setErrorMessage("削除確認テキストが一致しません。『削除します』と入力してください。");
      return;
    }
    setErrorMessage("");
    setMessage("");
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setMessage(result.message || "アカウントを削除しました。");
      setConfirmDeleteOpen(false);
      setDeleteConfirmText("");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="dashboard-page">
      <AppHeader />
      <section className="maker-card">
        <p className="maker-kicker">Account</p>
        <HomeBackLink />
        <h1>登録情報管理</h1>
        <p>
          表示名、作者プロフィール、SNS、通知設定を管理できます。ハンドルを変更すると作者ページURLも変わります。
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
                <span>メールアドレス（変更不可）</span>
                <input value={profile.email} readOnly aria-readonly="true" />
              </label>
              <label>
                <span>作者ハンドル</span>
                <input value={profile.handle} onChange={(event) => update("handle", normalizeHandle(event.target.value, ""))} />
              </label>
              <label>
                <span>アイコンURL</span>
                <input value={profile.avatarPath} onChange={(event) => update("avatarPath", event.target.value)} placeholder="https://example.com/avatar.png" />
              </label>
              <label>
                <span>Webサイト</span>
                <input value={profile.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://example.com" />
              </label>
              <label>
                <span>X</span>
                <input value={xUrl} onChange={(event) => setXUrl(event.target.value)} placeholder="https://x.com/your_account" />
              </label>
              <label>
                <span>note</span>
                <input value={noteUrl} onChange={(event) => setNoteUrl(event.target.value)} placeholder="https://note.com/your_account" />
              </label>
              <label>
                <span>その他SNS / Webサイト</span>
                <input value={otherUrl} onChange={(event) => setOtherUrl(event.target.value)} placeholder="https://example.com/profile" />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={profile.isPublic} onChange={(event) => update("isPublic", event.target.checked)} />
                <span>作者ページを公開する</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => setPreferences((current) => ({ ...current, emailNotifications: event.target.checked }))} />
                <span>メール通知を受け取る</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={preferences.campaignNotifications} onChange={(event) => setPreferences((current) => ({ ...current, campaignNotifications: event.target.checked }))} />
                <span>キャンペーン情報を受け取る</span>
              </label>
            </div>
            <label className="maker-full">
              <span>自己紹介</span>
              <textarea rows={4} value={profile.bio} onChange={(event) => update("bio", event.target.value)} />
            </label>
            <div className="maker-actions">
              <button className="maker-primary-button" type="button" disabled={isSaving} onClick={() => void save()}>
                {isSaving ? "保存中…" : "登録情報を保存"}
              </button>
              <button className="maker-secondary-button" type="button" disabled={isSaving} onClick={() => void signOut()}>
                ログアウト
              </button>
            </div>
            <p className="maker-note">メールアドレス変更は現在未対応です。必要な場合はお問い合わせからご連絡ください。</p>
          </>
        )}
        {errorMessage ? <p className="form-error" aria-live="polite">{errorMessage}</p> : null}
        {message ? <p className="maker-status" aria-live="polite">{message}</p> : null}
      </section>

      <section className="maker-card">
        <h2>パスワード変更</h2>
        <div className="maker-grid">
          <label>
            <span>現在のパスワード</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label>
            <span>新しいパスワード</span>
            <input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
          </label>
          <label>
            <span>新しいパスワード（確認）</span>
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
        </div>
        <div className="maker-actions">
          <button className="maker-primary-button" type="button" disabled={isChangingPassword} onClick={() => void onChangePassword()}>
            {isChangingPassword ? "変更中…" : "パスワードを変更"}
          </button>
        </div>
      </section>

      <section className="maker-card">
        <h2>アカウント削除</h2>
        <p>この操作は取り消せません。公開作品・プロフィール・分析データが削除されます。</p>
        {!confirmDeleteOpen ? (
          <div className="maker-actions">
            <button className="maker-small-button danger" type="button" onClick={() => setConfirmDeleteOpen(true)}>
              削除手続きへ進む
            </button>
          </div>
        ) : (
          <>
            <p className="maker-note">確認のため「削除します」と入力してください。</p>
            <label className="maker-full">
              <span>確認テキスト</span>
              <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
            </label>
            <div className="maker-actions">
              <button className="maker-small-button danger" type="button" disabled={isDeleting} onClick={() => void onDeleteAccount()}>
                {isDeleting ? "削除中…" : "アカウントを削除"}
              </button>
              <button className="maker-secondary-button" type="button" disabled={isDeleting} onClick={() => setConfirmDeleteOpen(false)}>
                キャンセル
              </button>
            </div>
          </>
        )}
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
