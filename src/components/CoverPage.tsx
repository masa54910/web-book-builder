/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import type { CSSProperties } from "react";
import type { BookConfig } from "@/config/bookConfig";

function CoverImage({
  src,
  alt,
  contain = false,
}: {
  src: string;
  alt: string;
  contain?: boolean;
}) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      <img
        className="cover-uploaded-image"
        src={src}
        alt={alt}
        style={{ objectFit: contain ? "contain" : "cover" }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading="eager"
      sizes="(max-width: 760px) 100vw, 50vw"
      style={{ objectFit: contain ? "contain" : "cover", objectPosition: "center center" }}
    />
  );
}

export default function CoverPage({
  back = false,
  config,
}: {
  back?: boolean;
  config: BookConfig;
}) {
  const coverStyle = config.themeSettings?.coverStyle || "overlay";
  const coverTone = config.themeSettings?.accentColor || "#6bb9ad";
  const displayTitleLines = config.displayTitleLines?.filter((line) => line.trim().length > 0);
  if (back) {
    return (
      <div className={`back-cover-page book-cover-style-${coverStyle}`} style={{ "--book-accent-color": coverTone } as CSSProperties}>
        {config.coverImage ? (
          <CoverImage
            src={config.coverImage}
            alt={`${config.title} 裏表紙`}
          />
        ) : null}
        <div className="back-cover-mark">{config.title.slice(0, 2)}</div>
        <p>{config.publisherName}</p>
      </div>
    );
  }

  return (
    <div className={`cover-page book-cover-style-${coverStyle}`} style={{ "--book-accent-color": coverTone } as CSSProperties}>
      {config.coverImage ? (
        <CoverImage
          src={config.coverImage}
          alt={`${config.title} 表紙`}
          contain
        />
      ) : null}
      <span className="cover-series">Web Book Builder</span>
      <div className="cover-copy">
        {displayTitleLines?.length ? (
          <h2 className="fixed-title-lines fixed-title-lines-cover" aria-label={config.title}>
            {displayTitleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
        ) : (
          <h2>{config.title}</h2>
        )}
        <p>{config.subtitle}</p>
      </div>
      <span className="cover-author">{config.author}</span>
    </div>
  );
}
