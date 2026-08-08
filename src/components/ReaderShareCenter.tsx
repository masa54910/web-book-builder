"use client";

import { useMemo, useState } from "react";

import ServiceIcon from "@/components/ui/ServiceIcons";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";
import { recordShare } from "@/lib/readerAnalytics";
import {
  buildReaderFacebookShareUrl,
  buildReaderLineShareUrl,
  buildReaderLineWebShareUrl,
  buildReaderShareTemplate,
  buildReaderXShareUrl,
  READER_NOTE_NEW_POST_URL,
} from "@/lib/readerShareTemplates";
import { copyTextToClipboard } from "@/lib/shareClipboard";

type Props = {
  bookId: string;
  cloudBookId?: string;
  title: string;
  description?: string;
  shareUrl: string;
};

type CopyKind = "template" | "line" | "url";

export default function ReaderShareCenter({
  bookId,
  cloudBookId,
  title,
  description,
  shareUrl,
}: Props) {
  const [status, setStatus] = useState("");
  const isMobileDevice = useIsMobileDevice();
  const templateInput = useMemo(() => ({ title, description, url: shareUrl }), [description, shareUrl, title]);
  const template = useMemo(() => buildReaderShareTemplate(templateInput), [templateInput]);
  const xShareUrl = useMemo(() => buildReaderXShareUrl(templateInput), [templateInput]);
  const facebookShareUrl = useMemo(() => buildReaderFacebookShareUrl(templateInput), [templateInput]);
  const lineShareUrl = useMemo(
    () => (isMobileDevice ? buildReaderLineShareUrl(templateInput) : buildReaderLineWebShareUrl(templateInput)),
    [isMobileDevice, templateInput],
  );

  const announce = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 3200);
  };

  const copy = async (kind: CopyKind, value: string) => {
    const copied = await copyTextToClipboard(value);
    if (!copied) {
      announce(kind === "url" ? "URLをコピーできませんでした。" : "共有文をコピーできませんでした。ブラウザのクリップボード許可を確認してください。");
      return;
    }
    recordShare(bookId, cloudBookId);
    if (kind === "template") announce("投稿テンプレートをコピーしました。noteの記事本文へ貼り付けてください。");
    else if (kind === "line") announce("共有文をコピーしました。LINEの送信画面へ貼り付けてください。");
    else announce("URLをコピーしました。");
  };

  const onShare = () => recordShare(bookId, cloudBookId);

  return (
    <section className="reader-share-center promotion-center maker-card" aria-labelledby="reader-share-title">
      <div className="promotion-heading">
        <div>
          <p className="maker-kicker">Share this Web Book</p>
          <h2 id="reader-share-title">このWebブックをおすすめする</h2>
          <p>気に入った作品をSNSでシェアできます。</p>
        </div>
      </div>

      <article className="reader-url-copy-card promotion-card">
        <div className="promotion-service-label">
          <span className="promotion-service-icon promotion-service-icon-copy" aria-hidden="true">↗</span>
          <strong>URLコピー</strong>
        </div>
        <div className="reader-url-copy-content">
          <h3>公開URLをコピーして、直接貼り付ける。</h3>
          <p className="promotion-url" title={shareUrl}>{shareUrl}</p>
        </div>
        <button className="maker-secondary-button" type="button" onClick={() => void copy("url", shareUrl)}>
          <span>URLをコピー</span>
        </button>
      </article>

      <div className="promotion-grid promotion-share-grid" aria-label="読者向け共有ツール">
        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="x" className="promotion-service-icon promotion-service-icon-x" />
            <strong>X</strong>
          </div>
          <h3>Xで共有</h3>
          <p>作品の紹介と公開URLをXの投稿画面へ渡します。</p>
          <a className="maker-secondary-button" href={xShareUrl} target="_blank" rel="noopener noreferrer" onClick={onShare}>
            <ServiceIcon service="x" className="promotion-action-icon promotion-action-icon-x" />
            <span>Xで共有</span>
          </a>
        </article>

        <article className="promotion-card">
          <div className="promotion-service-label">
            <ServiceIcon service="note" className="promotion-service-icon promotion-service-icon-note" />
            <strong>note</strong>
          </div>
          <h3>noteへ投稿</h3>
          <p>テンプレートをコピーし、noteの記事本文へ貼り付けてください。</p>
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" onClick={() => void copy("template", template)}>
              <ServiceIcon service="note" className="promotion-action-icon promotion-action-icon-note" />
              <span>テンプレートをコピー</span>
            </button>
            <a className="maker-secondary-button" href={READER_NOTE_NEW_POST_URL} target="_blank" rel="noopener noreferrer" onClick={onShare}>
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
          <h3>Facebookで共有</h3>
          <p>共有文をコピーするか、公開URLをFacebookの共有画面へ渡します。</p>
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" onClick={() => void copy("template", template)}>
              <span>投稿文をコピー</span>
            </button>
            <a className="maker-secondary-button" href={facebookShareUrl} target="_blank" rel="noopener noreferrer" onClick={onShare}>
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
          <h3>LINEで共有</h3>
          <p>共有文をコピーするか、LINEの送信画面へ作品を渡します。</p>
          <div className="promotion-card-actions">
            <button className="maker-secondary-button" type="button" onClick={() => void copy("line", template)}>
              <span>共有文をコピー</span>
            </button>
            <a className="maker-secondary-button" href={lineShareUrl} target="_blank" rel="noopener noreferrer" onClick={onShare}>
              <ServiceIcon service="line" className="promotion-action-icon promotion-action-icon-line" />
              <span>LINEで共有</span>
            </a>
          </div>
        </article>

      </div>
      {status ? <p className="maker-status" role="status" aria-live="polite">{status}</p> : null}
    </section>
  );
}
