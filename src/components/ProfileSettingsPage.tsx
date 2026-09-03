"use client";

import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import LogoutButton from "@/components/LogoutButton";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import StatusMessage from "@/components/ui/StatusMessage";
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
import { resolveStorageUrl } from "@/lib/bookAssetStorage";
import { uploadProfileAvatar } from "@/lib/profileAssetStorage";
import { authorPagePath } from "@/lib/authorPage";
import SellerConnectPanel from "@/components/SellerConnectPanel";

const PROFILE_LOAD_ERROR_MESSAGE = "プロフィール情報を読み込めませんでした。時間をおいて再度お試しください。";
const PROFILE_SAVE_ERROR_MESSAGE = "登録情報を保存できませんでした。時間をおいて再度お試しください。";

function socialValue(links: AuthorLinkRecord[], type: AuthorLinkRecord["linkType"]) {
  return links.find((link) => link.linkType === type)?.url || "";
}

function buildSocialLinks(
  xUrl: string,
  noteUrl: string,
  instagramUrl: string,
  facebookUrl: string,
  lineUrl: string,
  otherUrl: string,
) {
  const links: AuthorLinkRecord[] = [];
  if (xUrl.trim()) {
    links.push({ id: "x", label: "X", url: xUrl, linkType: "x" });
  }
  if (noteUrl.trim()) {
    links.push({ id: "note", label: "note", url: noteUrl, linkType: "note" });
  }
  if (instagramUrl.trim()) {
    links.push({ id: "instagram", label: "Instagram", url: instagramUrl, linkType: "instagram" });
  }
  if (facebookUrl.trim()) {
    links.push({ id: "facebook", label: "Facebook", url: facebookUrl, linkType: "facebook" });
  }
  if (lineUrl.trim()) {
    links.push({ id: "line", label: "LINE", url: lineUrl, linkType: "line" });
  }
  if (otherUrl.trim()) {
    links.push({ id: "other", label: "Webサイト", url: otherUrl, linkType: "other" });
  }
  return links;
}

export default function ProfileSettingsPage() {
  const { user, changePassword, deleteAccount } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    emailNotifications: true,
    campaignNotifications: false,
  });
  const [xUrl, setXUrl] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [otherUrl, setOtherUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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
    let active = true;

    Promise.allSettled([
      getOwnProfile(user.id, { email: user.email, displayName: user.displayName }),
      getOwnAuthorLinks(user.id),
      getOwnProfilePreferences(user.id),
    ])
      .then(([profileResult, linksResult, preferencesResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
          if (/^https?:\/\//i.test(profileResult.value.avatarPath)) {
            setAvatarPreviewUrl(profileResult.value.avatarPath);
          } else if (profileResult.value.avatarPath) {
            void resolveStorageUrl(profileResult.value.avatarPath).then(setAvatarPreviewUrl);
          }
        } else {
          console.error("settings.profile.load failed", profileResult.reason);
          setErrorMessage(PROFILE_LOAD_ERROR_MESSAGE);
          setIsProfileLoading(false);
          return;
        }

        if (linksResult.status === "fulfilled") {
          setXUrl(socialValue(linksResult.value, "x"));
          setNoteUrl(socialValue(linksResult.value, "note"));
          setInstagramUrl(socialValue(linksResult.value, "instagram"));
          setFacebookUrl(socialValue(linksResult.value, "facebook"));
          setLineUrl(socialValue(linksResult.value, "line"));
          setOtherUrl(socialValue(linksResult.value, "other") || socialValue(linksResult.value, "website"));
        } else {
          console.error("settings.authorLinks.load failed", linksResult.reason);
          setXUrl("");
          setNoteUrl("");
          setInstagramUrl("");
          setFacebookUrl("");
          setLineUrl("");
          setOtherUrl("");
        }

        if (preferencesResult.status === "fulfilled") {
          setPreferences(preferencesResult.value);
        } else {
          console.error("settings.preferences.load failed", preferencesResult.reason);
          setPreferences({
            emailNotifications: true,
            campaignNotifications: false,
          });
        }

        setIsProfileLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("settings.initialLoad.failed", error);
        setErrorMessage(PROFILE_LOAD_ERROR_MESSAGE);
        setIsProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const update = <K extends keyof ProfileRecord>(key: K, value: ProfileRecord[K]) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !user) return;
    setErrorMessage("");
    setMessage("");
    setIsUploadingAvatar(true);
    try {
      const storagePath = await uploadProfileAvatar(file, user.id);
      update("avatarPath", storagePath);
      const displayUrl = await resolveStorageUrl(storagePath);
      setAvatarPreviewUrl(displayUrl || storagePath);
      setMessage("プロフィール画像を読み込みました。保存すると反映されます。");
    } catch (error) {
      console.error("settings.profile.avatarUpload failed", error);
      setErrorMessage(error instanceof Error ? error.message : PROFILE_SAVE_ERROR_MESSAGE);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const save = async () => {
    if (!profile || !user) return;
    setErrorMessage("");
    setMessage("");
    setIsSaving(true);
    let saveStage = "profile";
    try {
      const next = await saveOwnProfile(profile);
      saveStage = "author_links";
      const socialLinks = buildSocialLinks(xUrl, noteUrl, instagramUrl, facebookUrl, lineUrl, otherUrl);
      await saveOwnAuthorLinks(user.id, socialLinks);
      saveStage = "profile_preferences";
      await saveOwnProfilePreferences(user.id, preferences);
      setProfile(next);
      setMessage("登録情報を保存しました。");
    } catch (error) {
      const details = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
      console.error("settings.profile.save failed", {
        operation: "save-profile-settings",
        stage: saveStage,
        status: typeof details.status === "number" ? details.status : undefined,
        code: typeof details.code === "string" ? details.code : undefined,
        message: typeof details.message === "string" ? details.message : error instanceof Error ? error.message : undefined,
        details: typeof details.details === "string" ? details.details : undefined,
        hint: typeof details.hint === "string" ? details.hint : undefined,
      });
      setErrorMessage(PROFILE_SAVE_ERROR_MESSAGE);
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
    <main className="dashboard-page profile-settings-page">
      <AppHeader />
      <div className="settings-sections">
        <section className="maker-card">
          <p className="maker-kicker">Account</p>
          <HomeBackLink />
          <h1>登録情報管理</h1>
          <p>
            表示名、作者プロフィール、SNS、通知設定を管理できます。ハンドルを変更すると作者ページURLも変わります。
          </p>
          {isProfileLoading ? (
            <LoadingState label="プロフィールを読み込んでいます…" className="reader-loading" />
          ) : !profile ? (
            <StatusMessage variant="error" message={PROFILE_LOAD_ERROR_MESSAGE} className="maker-status" />
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
                <span>プロフィール画像ファイル</span>
                <span className="maker-secondary-button profile-avatar-file-trigger">ファイルを選択</span>
                <input className="profile-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploadingAvatar} onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
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
                <span>Instagram</span>
                <input value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://instagram.com/your_account" />
              </label>
              <label>
                <span>Facebook</span>
                <input value={facebookUrl} onChange={(event) => setFacebookUrl(event.target.value)} placeholder="https://www.facebook.com/your_account" />
              </label>
              <label>
                <span>LINE</span>
                <input value={lineUrl} onChange={(event) => setLineUrl(event.target.value)} placeholder="https://line.me/ti/p/your_account" />
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
              {avatarPreviewUrl ? (
                <div className="profile-avatar-preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="profile-avatar-preview" src={avatarPreviewUrl} alt="プロフィール画像のプレビュー" />
                </div>
              ) : null}
              <label className="maker-full">
                <span>自己紹介</span>
                <textarea rows={4} value={profile.bio} onChange={(event) => update("bio", event.target.value)} />
              </label>
              <div className="maker-actions">
                <Button loading={isSaving} onClick={() => void save()}>
                  登録情報を保存
                </Button>
                {profile.handle ? (
                  <Button variant="secondary" href={authorPagePath(profile.handle)} openInNewTab>
                    公開ページを見る
                  </Button>
                ) : null}
                <LogoutButton />
              </div>
              <p className="maker-note">メールアドレス変更は現在未対応です。必要な場合はお問い合わせからご連絡ください。</p>
            </>
          )}
          {errorMessage ? <StatusMessage variant="error" message={errorMessage} className="form-error" /> : null}
          {message ? <StatusMessage variant="success" message={message} className="maker-status" /> : null}
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
            <Button loading={isChangingPassword} onClick={() => void onChangePassword()}>
              パスワードを変更
            </Button>
          </div>
        </section>

        <section className="maker-card">
          <h2>アカウント削除</h2>
          <p>この操作は取り消せません。公開作品・プロフィール・分析データが削除されます。</p>
          {!confirmDeleteOpen ? (
            <div className="maker-actions">
              <Button variant="danger" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                削除手続きへ進む
              </Button>
            </div>
          ) : (
            <>
              <p className="maker-note">確認のため「削除します」と入力してください。</p>
              <label className="maker-full">
                <span>確認テキスト</span>
                <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
              </label>
              <div className="maker-actions">
                <Button variant="danger" size="sm" loading={isDeleting} onClick={() => void onDeleteAccount()}>
                  アカウントを削除
                </Button>
                <Button variant="secondary" disabled={isDeleting} onClick={() => setConfirmDeleteOpen(false)}>
                  キャンセル
                </Button>
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
      </div>
      <div className="settings-sections">
        <SellerConnectPanel />
      </div>
    </main>
  );
}
