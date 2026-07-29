"use client";

import type { BookConfig } from "@/config/bookConfig";
import { recordExternalLinkClick } from "@/lib/readerAnalytics";

export default function ColophonPage({ config, cloudBookId }: { config: BookConfig; cloudBookId?: string }) {
  return (
    <div className="colophon-page">
      <p className="editorial-label">Colophon</p>
      <h2>奥付</h2>
      <dl>
        <dt>作品</dt><dd>{config.title}</dd>
        <dt>著者</dt><dd>{config.author}</dd>
        <dt>発行</dt><dd>{config.publisherName}</dd>
        <dt>公開年</dt><dd>{config.publishedAt}</dd>
        <dt>権利表記</dt><dd>{config.copyrightText}</dd>
      </dl>
      {config.externalLinks?.length ? (
        <div className="external-links">
          <p>外部リンク</p>
          <ul>
            {config.externalLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => recordExternalLinkClick(config.bookId, cloudBookId)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {config.branding?.showCreatedWithWebBookMaker !== false ? (
        <div className="created-with">
          <span>Created with WebBookMaker</span>
          <a href="/" target="_blank" rel="noreferrer">
            あなたもWeb書籍を作る
          </a>
        </div>
      ) : null}
      <div className="chart-rule" aria-hidden="true" />
    </div>
  );
}
