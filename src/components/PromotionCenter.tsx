"use client";

import { useEffect, useMemo, useState } from "react";

import type { BookProject } from "@/lib/bookProject";
import { trackEvent } from "@/lib/analytics";
import { buildPromotionAsset, xIntentUrl } from "@/lib/promotion";
import { buildFacebookShareUrl, buildShareTemplate } from "@/lib/shareTemplates";
import { renderBookTrailer, preferredVideoMimeType } from "@/lib/videoRenderer";
import type { SupportedLocale } from "@/lib/localization";
import CharacterAssistant from "@/components/CharacterAssistant";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PromotionCenter({
  project,
  slug,
  cloudBookId,
  locale = "ja",
}: {
  project: BookProject;
  slug: string;
  cloudBookId?: string;
  locale?: SupportedLocale;
}) {
  const [status, setStatus] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [copied, setCopied] = useState("");
  const promotion = useMemo(
    () =>
      buildPromotionAsset({
        config: project.config,
        slug,
        locale,
        origin: typeof window === "undefined" ? undefined : window.location.origin,
      }),
    [locale, project.config, slug],
  );
  const noteTemplate = useMemo(
    () => buildShareTemplate({ platform: "note", title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const facebookTemplate = useMemo(
    () => buildShareTemplate({ platform: "facebook", title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const facebookUrl = useMemo(
    () => buildFacebookShareUrl({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );

  useEffect(() => {
    trackEvent("promotion_center_opened", { bookId: cloudBookId || project.config.bookId });
  }, [cloudBookId, project.config.bookId]);

  const copyText = async (label: string, text: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(successMessage || `${label}をコピーしました。`);
      window.setTimeout(() => setCopied(""), 2600);
      return true;
    } catch (error) {
      console.warn("[promotion-copy] failed", {
        label,
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus("コピーできませんでした。もう一度お試しください。");
      return false;
    }
  };

  const createVideo = async () => {
    setIsRendering(true);
    setStatus("動画をレンダリングしています…");
    trackEvent("video_created", { bookId: cloudBookId || project.config.bookId });
    try {
      const result = await renderBookTrailer(project, promotion);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(result.blob);
      setVideoUrl(url);
      downloadBlob(result.blob, result.fileName);
      setStatus(`${result.fileName} を保存しました。`);
      trackEvent("video_saved", { bookId: cloudBookId || project.config.bookId, mimeType: result.mimeType });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "動画生成に失敗しました。公開状態には影響しません。");
    } finally {
      setIsRendering(false);
    }
  };

  const openX = async () => {
    const target = window.open(xIntentUrl(promotion.xPost), "_blank", "noopener,noreferrer");
    const copiedOk = await copyText("X投稿文", promotion.xPost);
    if (!copiedOk) return;
    trackEvent("x_clicked", { bookId: cloudBookId || project.config.bookId });
    trackEvent("promotion_completed", { bookId: cloudBookId || project.config.bookId, channel: "x" });
    if (!target) setStatus("X投稿画面を開けませんでした。ポップアップを許可してください。");
  };

  const openNote = async () => {
    const target = window.open("https://note.com/notes/new", "_blank", "noopener,noreferrer");
    const copiedOk = await copyText(
      "note記事",
      noteTemplate,
      "投稿用テンプレートをコピーしました。noteの記事画面で貼り付けてください。",
    );
    if (!copiedOk) return;
    trackEvent("note_clicked", { bookId: cloudBookId || project.config.bookId });
    trackEvent("promotion_completed", { bookId: cloudBookId || project.config.bookId, channel: "note" });
    if (!target) setStatus("noteの記事画面を開けませんでした。ポップアップを許可してください。");
  };

  const openFacebook = async () => {
    const target = window.open(facebookUrl, "_blank", "noopener,noreferrer");
    const copiedOk = await copyText(
      "Facebook投稿文",
      facebookTemplate,
      "投稿用テンプレートをコピーしました。Facebookの投稿欄へ貼り付けてください。",
    );
    if (!copiedOk) return;
    trackEvent("facebook_clicked", { bookId: cloudBookId || project.config.bookId });
    trackEvent("promotion_completed", { bookId: cloudBookId || project.config.bookId, channel: "facebook" });
    if (!target) setStatus("Facebookの共有画面を開けませんでした。ポップアップを許可してください。");
  };

  return (
    <section className="promotion-center maker-card" aria-labelledby="promotion-center-title">
      <div className="promotion-heading">
        <div>
          <p className="maker-kicker">Promotion Center</p>
          <h2 id="promotion-center-title">作品を広める</h2>
          <p>保存して終わりではなく、読者へ届けるところまでを支えます。</p>
        </div>
        <CharacterAssistant event="publish" compact />
      </div>

      <div className="promotion-grid promotion-video-grid">
        <article className="promotion-card">
          <strong>Video</strong>
          <h3>動画を作成</h3>
          <p>作品データから16:9の紹介動画をレンダリングします。対応形式: {preferredVideoMimeType() || "未対応"}</p>
          <button className="maker-primary-button" type="button" disabled={isRendering} onClick={() => void createVideo()}>
            {isRendering ? "生成中…" : "動画を作成"}
          </button>
          {videoUrl ? (
            <video className="promotion-video-preview" src={videoUrl} controls playsInline />
          ) : null}
        </article>
      </div>

      <div className="promotion-grid promotion-share-grid" aria-label="共有ツール">
        <article className="promotion-card">
          <strong>X</strong>
          <h3>Xに投稿する</h3>
          <p>投稿文、ハッシュタグ、共有URLをコピーしてX投稿画面を開きます。動画は保存済みファイルを添付してください。</p>
          <p className="promotion-preview">Xカード画像: {promotion.ogImageUrl}</p>
          <textarea readOnly value={promotion.xPost} rows={6} />
          <button className="maker-secondary-button" type="button" onClick={() => void openX()}>
            Xに投稿する
          </button>
        </article>
        <article className="promotion-card">
          <strong>note</strong>
          <h3>note記事を作る</h3>
          <p>新作公開テンプレートを生成します。コピー後、noteで編集して公開できます。</p>
          <textarea readOnly value={noteTemplate} rows={8} aria-label="note投稿テンプレート" />
          <button className="maker-secondary-button" type="button" onClick={() => void openNote()}>
            noteを開く
          </button>
        </article>
        <article className="promotion-card">
          <strong>Facebook</strong>
          <h3>Facebookへ投稿する</h3>
          <p>投稿用テンプレートをコピーして、Facebookの共有画面を開きます。</p>
          <textarea readOnly value={facebookTemplate} rows={8} aria-label="Facebook投稿テンプレート" />
          <button className="maker-secondary-button" type="button" onClick={() => void openFacebook()}>
            Facebookへ投稿する
          </button>
        </article>
        <article className="promotion-card">
          <strong>Copy</strong>
          <h3>URLコピー</h3>
          <p className="promotion-url" title={promotion.shareUrl}>{promotion.shareUrl}</p>
          <button className="maker-secondary-button" type="button" onClick={() => void copyText("URL", promotion.shareUrl)}>
            URLコピー
          </button>
        </article>
      </div>

      <div className="promotion-disabled-channels" aria-label="今後追加予定">
        {["Instagram", "Threads", "Bluesky", "TikTok", "YouTube", "Preview", "Analytics"].map((label) => (
          <span key={label}>{label} 準備中</span>
        ))}
      </div>
      {copied ? <p className="maker-status" aria-live="polite">{copied}</p> : null}
      {status ? <p className="maker-status">{status}</p> : null}
    </section>
  );
}
