import type { BookConfig } from "@/config/bookConfig";

export default function TitlePage({ config }: { config: BookConfig }) {
  return (
    <div className="title-page">
      <p className="editorial-label">Static Web Edition</p>
      <p className="author-line">{config.author}</p>
      <div className="chart-rule" aria-hidden="true" />
    </div>
  );
}
