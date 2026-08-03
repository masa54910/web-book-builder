"use client";

import type { BookConfig } from "@/config/bookConfig";
import { recordExternalLinkClick } from "@/lib/readerAnalytics";

function formatPublishedYearMonth(publishedAt: string) {
  const source = publishedAt.trim();
  const now = new Date();
  const yearMonth = source.match(/^(\d{4})(?:[-/.年\s]+(\d{1,2}))?/);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2] || now.getMonth() + 1);
    if (year > 0 && month >= 1 && month <= 12) {
      return `${year}年${month}月`;
    }
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月`;
  }

  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

export default function ColophonPage({ config, cloudBookId }: { config: BookConfig; cloudBookId?: string }) {
  const publishedYearMonth = formatPublishedYearMonth(config.publishedAt);

  return (
    <div className="colophon-page">
      <p className="editorial-label">Colophon</p>
      <h2>奥付</h2>
      <dl>
        <dt>作品</dt><dd>{config.title}</dd>
        <dt>著者</dt><dd>{config.author}</dd>
        <dt>発行</dt><dd>{config.publisherName}</dd>
        <dt>公開年月</dt><dd>{publishedYearMonth}</dd>
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
