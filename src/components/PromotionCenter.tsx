"use client";

import { useEffect, useMemo, useState } from "react";

import type { BookProject } from "@/lib/bookProject";
import { trackEvent } from "@/lib/analytics";
import { buildPromotionAsset, xIntentUrl } from "@/lib/promotion";
import { buildFacebookShareUrl, buildLineShareTemplate, buildLineShareUrl, buildShareTemplate, NOTE_NEW_POST_URL } from "@/lib/shareTemplates";
import { copyTextToClipboard } from "@/lib/shareClipboard";
import { renderBookTrailer, preferredVideoMimeType } from "@/lib/videoRenderer";
import type { SupportedLocale } from "@/lib/localization";
import CharacterAssistant from "@/components/CharacterAssistant";
import ServiceIcon from "@/components/ui/ServiceIcons";

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
  const [noteReady, setNoteReady] = useState(false);
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
  const lineTemplate = useMemo(
    () => buildLineShareTemplate({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const lineUrl = useMemo(
    () => buildLineShareUrl({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );

  useEffect(() => {
    trackEvent("promotion_center_opened", { bookId: cloudBookId || project.config.bookId });
  }, [cloudBookId, project.config.bookId]);

  const copyText = async (label: string, text: string, successMessage?: string, errorMessage?: string) => {
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setStatus("");
      setCopied(successMessage || `${label}をコピーしました。`);
      window.setTimeout(() => setCopied(""), 2600);
      return true;
    }

    setCopied("");
    setStatus(errorMessage || "テンプレートをコピーできませんでした。ブラウザのクリップボード許可を確認してください。");
    return false;
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

  const trackPromotion = (channel: "x" | "note" | "facebook" | "line") => {
    trackEvent(`${channel}_clicked`, { bookId: cloudBookId || project.config.bookId });
    trackEvent("promotion_completed", { bookId: cloudBookId || project.config.bookId, channel });
  };

  const copyNoteTemplate = async () => {
    const copiedOk = await copyText(
      "noteテンプレート",
      noteTemplate,
      "投稿テンプレートをコピーしました。noteの記事本文へ貼り付けてください。",
      "テンプレートをコピーできませんでした。ブラウザのクリップボード許可を確認してください。",
    );
    setNoteReady(copiedOk);
  };

  const copyLineTemplate = () => {
    void copyText(
      "LINE共有文",
      lineTemplate,
      "共有文をコピーしました。LINEへ貼り付けてください。",
      "共有文をコピーできませんでした。ブラウザのクリップボード許可を確認してください。",
    );
  };

  const openLine = async () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: project.config.title, text: lineTemplate, url: promotion.shareUrl });
        trackPromotion("line");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (isMobile) {
      window.location.assign(lineUrl);
      trackPromotion("line");
      return;
    }

    setStatus("PCブラウザではLINE共有画面を直接開けない場合があります。共有文をコピーしてください。");
  };

  const xShareUrl = xIntentUrl(promotion.xPost);

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
          <div className="promotion-service-label">
            <ServiceIcon service="x" className="promotion-service-icon promotion-service-icon-x" />
            <strong>X</strong>
          </div>
          <h3>Xに投稿する</h3>
          <p>投稿文、ハッシュタグ、共有URLをコピーしてX投稿画面を開きます。動画は保存済みファイルを添付してください。</p>
          <p className="promotion-preview">Xカード画像: {promotion.ogImageUrl}</p>
          <textarea readOnly value={promotion.xPost} rows={6} />
          <a className="maker-secondary-button" href={xShareUrl} target="_blank" rel="noopener noreferrer" aria-label="Xで作品を共有" onClick={() => trackPromotion("x")}>
            <ServiceIcon service="x" className="promotion-action-icon promotion-action-icon-x" />
            <span>Xで共有</span>
          </a>
        </article>
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="note" className="promotion-service-icon promotion-service-icon-note" />
            <strong>note</strong>
          </div>
          <h3>note記事を作る</h3>
          <p>投稿テンプレートをコピーして、noteの新規記事画面を開きます。開いた画面で貼り付けてください。</p>
          <textarea readOnly value={noteTemplate} rows={8} aria-label="note投稿テンプレート" />
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" aria-label="note投稿テンプレートをコピー" onClick={() => void copyNoteTemplate()}>
              <ServiceIcon service="note" className="promotion-action-icon promotion-action-icon-note" />
              <span>テンプレートをコピー</span>
            </button>
            {noteReady ? (
              <a className="maker-secondary-button" href={NOTE_NEW_POST_URL} target="_blank" rel="noopener noreferrer" aria-label="noteの新規記事を開く" onClick={() => trackPromotion("note")}>
                <ServiceIcon service="note" className="promotion-action-icon promotion-action-icon-note" />
                <span>noteを開く</span>
              </a>
            ) : null}
          </div>
        </article>
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="facebook" className="promotion-service-icon promotion-service-icon-facebook" />
            <strong>Facebook</strong>
          </div>
          <h3>Facebookへ投稿する</h3>
          <p>公開URLをFacebookの共有画面へ渡します。投稿文が必要な場合は別途コピーできます。</p>
          <textarea readOnly value={facebookTemplate} rows={8} aria-label="Facebook投稿テンプレート" />
          <div className="promotion-card-actions">
            <a className="maker-secondary-button" href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebookで作品を共有" onClick={() => trackPromotion("facebook")}>
              <ServiceIcon service="facebook" className="promotion-action-icon promotion-action-icon-facebook" />
              <span>Facebookで共有</span>
            </a>
            <button className="maker-small-button" type="button" onClick={() => void copyText("Facebook投稿文", facebookTemplate, "投稿文をコピーしました。", "投稿文をコピーできませんでした。ブラウザのクリップボード許可を確認してください。")}>
              <span>投稿文をコピー</span>
            </button>
          </div>
        </article>
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="line" className="promotion-service-icon promotion-service-icon-line" />
            <strong>LINE</strong>
          </div>
          <h3>LINEで共有する</h3>
          <p>スマートフォンではLINE共有または端末の共有画面を開きます。PCでは共有文をコピーしてください。</p>
          <textarea readOnly value={lineTemplate} rows={8} aria-label="LINE共有テンプレート" />
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" aria-label="LINEで作品を共有" onClick={() => void openLine()}>
              <ServiceIcon service="line" className="promotion-action-icon promotion-action-icon-line" />
              <span>LINEで共有</span>
            </button>
            <button className="maker-small-button" type="button" onClick={copyLineTemplate}>
              <span>共有文をコピー</span>
            </button>
          </div>
        </article>
        <article className="promotion-card">
          <div className="promotion-service-label">
            <span className="promotion-service-icon promotion-service-icon-copy" aria-hidden="true">↗</span>
            <strong>URLコピー</strong>
          </div>
          <h3>URLコピー</h3>
          <p className="promotion-url" title={promotion.shareUrl}>{promotion.shareUrl}</p>
          <button className="maker-secondary-button" type="button" aria-label="公開URLをコピー" onClick={() => void copyText("URL", promotion.shareUrl, undefined, "URLをコピーできませんでした。ブラウザのクリップボード許可を確認してください。")}>
            <span aria-hidden="true">↗</span>
            <span>URLコピー</span>
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
