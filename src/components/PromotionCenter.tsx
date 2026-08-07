"use client";

import { useEffect, useMemo, useState } from "react";

import type { BookProject } from "@/lib/bookProject";
import { trackEvent } from "@/lib/analytics";
import { buildPromotionAsset } from "@/lib/promotion";
import { buildFacebookShareUrl, buildLineShareTemplate, buildLineShareUrl, buildLineWebShareUrl, buildShareTemplate, buildXShareUrl, NOTE_NEW_POST_URL } from "@/lib/shareTemplates";
import { copyTextToClipboard } from "@/lib/shareClipboard";
import type { SupportedLocale } from "@/lib/localization";
import CharacterAssistant from "@/components/CharacterAssistant";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";
import ServiceIcon from "@/components/ui/ServiceIcons";

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
  const lineTemplate = useMemo(
    () => buildLineShareTemplate({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const lineUrl = useMemo(
    () => buildLineShareUrl({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const lineWebUrl = useMemo(
    () => buildLineWebShareUrl({ title: project.config.title, description: project.config.description, url: promotion.shareUrl }),
    [project.config.description, project.config.title, promotion.shareUrl],
  );
  const isMobileDevice = useIsMobileDevice();
  const lineShareHref = isMobileDevice ? lineUrl : lineWebUrl;

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

  const trackPromotion = (channel: "x" | "note" | "facebook" | "line") => {
    trackEvent(`${channel}_clicked`, { bookId: cloudBookId || project.config.bookId });
    trackEvent("promotion_completed", { bookId: cloudBookId || project.config.bookId, channel });
  };

  const copyNoteTemplate = async () => {
    await copyText(
      "noteテンプレート",
      noteTemplate,
      "投稿テンプレートをコピーしました。noteの記事本文へ貼り付けてください。",
      "テンプレートをコピーできませんでした。ブラウザのクリップボード許可を確認してください。",
    );
  };

  const copyLineTemplate = () => {
    void copyText(
      "LINE共有文",
      lineTemplate,
      "共有文をコピーしました。LINEへ貼り付けてください。",
      "共有文をコピーできませんでした。ブラウザのクリップボード許可を確認してください。",
    );
  };

  const xShareUrl = buildXShareUrl({
    title: project.config.title,
    description: project.config.description,
    url: promotion.shareUrl,
    hashtags: promotion.hashtags,
  });

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

      <div className="promotion-grid promotion-share-grid" aria-label="共有ツール">
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="x" className="promotion-service-icon promotion-service-icon-x" />
            <strong>X</strong>
          </div>
          <h3>Xに投稿する</h3>
          <p>投稿文・ハッシュタグ・公開URLを含むX投稿画面を開きます。</p>
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
          <p>テンプレートをコピーしてnoteへ貼り付けるか、先にnoteの新規記事画面を開けます。</p>
          <textarea readOnly value={noteTemplate} rows={8} aria-label="note投稿テンプレート" />
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" aria-label="note投稿テンプレートをコピー" onClick={() => void copyNoteTemplate()}>
              <ServiceIcon service="note" className="promotion-action-icon promotion-action-icon-note" />
              <span>テンプレートをコピー</span>
            </button>
            <a className="maker-secondary-button" href={NOTE_NEW_POST_URL} target="_blank" rel="noopener noreferrer" aria-label="noteの新規記事を開く" onClick={() => trackPromotion("note")}>
              <ServiceIcon service="note" className="promotion-action-icon promotion-action-icon-note" />
              <span>noteを開く</span>
            </a>
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
            <button className="maker-small-button" type="button" onClick={() => void copyText("Facebook投稿文", facebookTemplate, "投稿文をコピーしました。", "投稿文をコピーできませんでした。ブラウザのクリップボード許可を確認してください。")}>
              <span>投稿文をコピー</span>
            </button>
            <a className="maker-secondary-button" href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebookで作品を共有" onClick={() => trackPromotion("facebook")}>
              <ServiceIcon service="facebook" className="promotion-action-icon promotion-action-icon-facebook" />
              <span>Facebookで共有</span>
            </a>
          </div>
        </article>
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="line" className="promotion-service-icon promotion-service-icon-line" />
            <strong>LINE</strong>
          </div>
          <h3>LINEで共有する</h3>
          <p>LINE共有URLを開きます。PCではLINEのログインやQR案内が表示される場合があります。必要に応じて共有文をコピーしてください。</p>
          <textarea readOnly value={lineTemplate} rows={8} aria-label="LINE共有テンプレート" />
          <div className="promotion-card-actions">
            <button className="maker-small-button" type="button" onClick={copyLineTemplate}>
              <span>共有文をコピー</span>
            </button>
            <a className="maker-secondary-button" href={lineShareHref} target="_blank" rel="noopener noreferrer" aria-label="LINEで作品を共有" onClick={() => trackPromotion("line")}>
              <ServiceIcon service="line" className="promotion-action-icon promotion-action-icon-line" />
              <span>LINEで共有</span>
            </a>
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

      {copied ? <p className="maker-status" aria-live="polite">{copied}</p> : null}
      {status ? <p className="maker-status">{status}</p> : null}
    </section>
  );
}
