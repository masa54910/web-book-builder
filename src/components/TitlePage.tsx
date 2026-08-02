import type { BookConfig } from "@/config/bookConfig";

export default function TitlePage({ config }: { config: BookConfig }) {
  const displayTitleLines = config.displayTitleLines?.filter((line) => line.trim().length > 0);

  return (
    <div className="title-page">
      <p className="editorial-label">Static Web Edition</p>
      {displayTitleLines?.length ? (
        <h2 className="fixed-title-lines fixed-title-lines-inner" aria-label={config.title}>
          {displayTitleLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      ) : (
        <h2>{config.title}</h2>
      )}
      <p className="author-line">{config.author}</p>
      <div className="chart-rule" aria-hidden="true" />
    </div>
  );
}
