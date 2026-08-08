/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import type { CSSProperties } from "react";

import type { BookThemeSettings } from "@/lib/themeSystem";
import {
  normalizeCoverDesign,
  positionToAlignItems,
  positionToJustifyContent,
  positionToObjectPosition,
  positionToTextAlign,
  type CoverDesign,
} from "@/lib/coverDesign";
import { isDisplayableImageUrl } from "@/lib/bookAssetStorage";

export type BookCoverData = {
  title: string;
  subtitle?: string;
  author: string;
  displayTitleLines?: string[];
  coverImage?: string;
  coverImageUrl?: string;
  coverStyle?: BookThemeSettings["coverStyle"];
  accentColor?: string;
  coverDesign?: CoverDesign;
};

function CoverImage({
  src,
  alt,
  fit,
  position,
  scale,
}: {
  src: string;
  alt: string;
  fit: "contain" | "cover";
  position: CoverDesign["imagePosition"];
  scale: number;
}) {
  const style = {
    objectFit: fit,
    objectPosition: positionToObjectPosition(position),
    transform: `scale(${scale})`,
  } satisfies CSSProperties;

  if (src.startsWith("data:") || src.startsWith("blob:") || /^https?:\/\//i.test(src)) {
    return <img className="cover-uploaded-image" src={src} alt={alt} style={style} />;
  }

  return (
    <Image
      className="cover-uploaded-image"
      src={src}
      alt={alt}
      fill
      loading="eager"
      sizes="(max-width: 760px) 100vw, 50vw"
      style={style}
    />
  );
}

export default function BookCover({ back = false, data }: { back?: boolean; data: BookCoverData }) {
  const design = normalizeCoverDesign(data.coverDesign);
  const coverStyle = data.coverStyle || "overlay";
  const coverTone = data.accentColor || "#6bb9ad";
  const coverTitle = design.titleTextOverride?.trim() || data.title;
  const displayTitleLines = design.titleTextOverride?.trim()
    ? design.titleTextOverride.split("\n")
    : data.displayTitleLines?.filter((line) => line.trim().length > 0);
  const showTitle = design.titleVisible !== false;
  const showAuthor = design.authorVisible !== false;
  const coverSrc = data.coverImageUrl || (isDisplayableImageUrl(data.coverImage) ? data.coverImage : "");
  const titlePosition = positionToTextAlign(design.titlePosition);
  const authorPosition = positionToTextAlign(design.authorPosition);
  const style = {
    "--book-accent-color": coverTone,
    "--cover-title-scale": design.titleScale,
    "--cover-title-origin": `${titlePosition} center`,
    "--cover-author-scale": design.authorScale,
    "--cover-author-origin": `${authorPosition} center`,
    "--cover-image-scale": design.imageScale,
    "--cover-overlay-opacity": design.overlayOpacity,
  } as CSSProperties;

  if (back) {
    return (
      <div className={`back-cover-page book-cover-style-${coverStyle} cover-layout-${design.layout}`} style={style}>
        <span className="back-cover-brand" aria-label="WebBookMaker">WebBookMaker</span>
      </div>
    );
  }

  return (
    <div className={`cover-page book-cover-style-${coverStyle} cover-layout-${design.layout}`} style={style}>
      <span className="cover-design-overlay" aria-hidden="true" />
      {showTitle || data.subtitle ? (
        <div
          className="cover-copy"
          style={{
            alignItems: positionToAlignItems(design.titlePosition),
            justifyContent: positionToJustifyContent(design.titlePosition),
            textAlign: titlePosition,
          }}
        >
          {showTitle ? (displayTitleLines?.length ? (
            <h2 className="fixed-title-lines fixed-title-lines-cover" aria-label={coverTitle}>
              {displayTitleLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
            </h2>
          ) : (
            <h2>{coverTitle}</h2>
          )) : null}
          {data.subtitle ? <p>{data.subtitle}</p> : null}
        </div>
      ) : null}
      {coverSrc ? (
        <div className="cover-image-slot" aria-hidden="true">
          <CoverImage
            src={coverSrc}
            alt={`${data.title} 表紙`}
            fit={design.imageFit}
            position={design.imagePosition}
            scale={design.imageScale}
          />
        </div>
      ) : null}
      {showAuthor ? (
        <span
          className="cover-author"
          style={{
            alignItems: positionToAlignItems(design.authorPosition),
            justifyContent: positionToJustifyContent(design.authorPosition),
            textAlign: authorPosition,
          }}
        >
          {data.author}
        </span>
      ) : null}
    </div>
  );
}
