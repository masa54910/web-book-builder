"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

import QrCodeIcon from "@/components/ui/QrCodeIcon";
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

function qrDownloadName(shareUrl: string) {
  try {
    const slug = decodeURIComponent(new URL(shareUrl).pathname.split("/").filter(Boolean).pop() || "book");
    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    return `webbookmaker-${safeSlug || "book"}-qr.png`;
  } catch {
    return "webbookmaker-book-qr.png";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] || character;
  });
}

export default function ReaderShareCenter({
  bookId,
  cloudBookId,
  title,
  description,
  shareUrl,
}: Props) {
  const [status, setStatus] = useState("");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPngDataUrl, setQrPngDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrStatus, setQrStatus] = useState("");
  const [isQrGenerating, setIsQrGenerating] = useState(false);
  const qrCloseRef = useRef<HTMLButtonElement | null>(null);
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

  const announceQr = (message: string) => {
    setQrStatus(message);
    window.setTimeout(() => setQrStatus(""), 3200);
  };

  const openQrModal = async () => {
    setIsQrOpen(true);
    setQrDataUrl("");
    setQrPngDataUrl("");
    setQrError("");
    setQrStatus("");
    setIsQrGenerating(true);
    try {
      const options = {
        errorCorrectionLevel: "M" as const,
        margin: 4,
        color: { dark: "#000000", light: "#ffffff" },
      };
      const [displayDataUrl, pngDataUrl] = await Promise.all([
        QRCode.toDataURL(shareUrl, { ...options, width: 320 }),
        QRCode.toDataURL(shareUrl, { ...options, width: 1024 }),
      ]);
      setQrDataUrl(displayDataUrl);
      setQrPngDataUrl(pngDataUrl);
    } catch {
      setQrError("QRコードを生成できませんでした。URLコピーをご利用ください。");
    } finally {
      setIsQrGenerating(false);
    }
  };

  const copyQrImage = async () => {
    if (!qrPngDataUrl || !navigator.clipboard?.write || !("ClipboardItem" in window)) {
      announceQr("このブラウザでは画像コピーに対応していません。PNG保存をご利用ください。");
      return;
    }

    try {
      const qrBlob = await (await fetch(qrPngDataUrl)).blob();
      const clipboardItem = new ClipboardItem({ [qrBlob.type || "image/png"]: qrBlob });
      await navigator.clipboard.write([clipboardItem]);
      recordShare(bookId, cloudBookId);
      announceQr("QRコードをコピーしました");
    } catch {
      announceQr("このブラウザでは画像コピーに対応していません。PNG保存をご利用ください。");
    }
  };

  const printQr = () => {
    if (!qrPngDataUrl) {
      announceQr("QRコードを準備できませんでした。もう一度お試しください。");
      return;
    }

    const printMarkup = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} | WebBookMaker</title>
    <style>
      @page { size: A4; margin: 20mm; }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { min-height: 240mm; display: grid; place-items: center; padding: 16mm; text-align: center; }
      .card { width: min(100%, 150mm); display: grid; justify-items: center; gap: 7mm; }
      h1 { margin: 0; font-size: 22pt; line-height: 1.35; overflow-wrap: anywhere; }
      img { display: block; width: 60mm; height: 60mm; image-rendering: pixelated; }
      p { margin: 0; font-size: 12pt; line-height: 1.7; }
      .brand { margin-top: 4mm; color: #123e68; font-size: 12pt; font-weight: 700; letter-spacing: .04em; }
    </style>
  </head>
  <body>
    <main><section class="card">
      <h1>${escapeHtml(title)}</h1>
      <img src="${escapeHtml(qrPngDataUrl)}" alt="${escapeHtml(title)}の公開URL QRコード" />
      <p>スマートフォンで読み取って<br />Webブックを読む</p>
      <p class="brand">WebBookMaker</p>
    </section></main>
    <script>
      window.addEventListener("load", function () {
        window.focus();
        window.print();
        window.addEventListener("afterprint", function () { window.close(); }, { once: true });
      });
    </script>
  </body>
</html>`;
    const printUrl = URL.createObjectURL(new Blob([printMarkup], { type: "text/html" }));
    const printWindow = window.open(printUrl, "_blank", "width=760,height=900");
    if (!printWindow) {
      URL.revokeObjectURL(printUrl);
      announceQr("印刷画面を開けませんでした。ブラウザのポップアップ設定を確認してください。");
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
  };

  useEffect(() => {
    if (!isQrOpen) return;
    qrCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsQrOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isQrOpen]);

  return (
    <section className="reader-share-center promotion-center maker-card" aria-labelledby="reader-share-title">
      <div className="promotion-heading">
        <div>
          <p className="maker-kicker">Share this Web Book</p>
          <h2 id="reader-share-title">このWebブックをおすすめする</h2>
          <p>気に入った作品をSNSでシェアできます。</p>
        </div>
      </div>

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
      <div className="reader-share-actions" aria-label="URLとQRコードの共有ツール">
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

        <article className="promotion-card reader-qr-card">
          <div className="promotion-service-label">
            <QrCodeIcon className="promotion-service-icon promotion-service-icon-qr" />
            <strong>QRコード</strong>
          </div>
          <h3>QRコードでシェア</h3>
          <p>スマートフォンで読み取ると、このWebブックを開けます。</p>
          <button className="maker-secondary-button" type="button" aria-label="QRコードを表示" onClick={() => void openQrModal()}>
            <QrCodeIcon className="promotion-action-icon promotion-action-icon-qr" />
            <span>QRコード</span>
          </button>
        </article>
      </div>
      {status ? <p className="maker-status" role="status" aria-live="polite">{status}</p> : null}

      {isQrOpen ? (
        <div className="qr-share-modal-backdrop" role="presentation" onMouseDown={() => setIsQrOpen(false)}>
          <section
            className="qr-share-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-share-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="qr-share-modal-heading">
              <h2 id="qr-share-modal-title">QRコードでシェア</h2>
              <button ref={qrCloseRef} className="qr-share-modal-close" type="button" aria-label="QRコード共有を閉じる" onClick={() => setIsQrOpen(false)}>×</button>
            </header>
            <div className="qr-share-modal-body">
              <div className="qr-share-code" aria-live="polite">
                {isQrGenerating ? <p>QRコードを生成しています…</p> : null}
                {!isQrGenerating && qrError ? <p className="qr-share-error" role="alert">{qrError}</p> : null}
                {!isQrGenerating && !qrError && qrDataUrl ? <Image src={qrDataUrl} alt={`${title}の公開URL QRコード`} width={280} height={280} unoptimized /> : null}
              </div>
              <p className="qr-share-title">{title}</p>
              <p className="qr-share-description">スマートフォンで読み取ると、このWebブックを開けます。</p>
              <p className="qr-share-modal-status" role="status" aria-live="polite">{qrStatus}</p>
              <div className="qr-share-modal-actions">
                <button className="maker-primary-link qr-share-modal-action" type="button" disabled={!qrPngDataUrl} onClick={() => void copyQrImage()}>QRをコピー</button>
                <button className="maker-secondary-button qr-share-modal-action" type="button" disabled={!qrPngDataUrl} onClick={printQr}>印刷</button>
                {qrPngDataUrl ? <a className="maker-secondary-button qr-share-modal-action" href={qrPngDataUrl} download={qrDownloadName(shareUrl)}>PNG保存</a> : <button className="maker-secondary-button qr-share-modal-action" type="button" disabled>PNG保存</button>}
                <button className="maker-secondary-button qr-share-modal-url-action" type="button" onClick={() => void copy("url", shareUrl)}>URLをコピー</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
