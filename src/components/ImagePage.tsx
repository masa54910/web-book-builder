import type { PageAdjustment } from "@/lib/pageAdjustments";

function ReaderImage({ src, alt }: { src: string; alt: string }) {
  // Use intrinsic sizing so portrait assets are never stretched to the frame.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="reader-image"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

export default function ImagePage({
  src,
  alt,
  caption,
  missing = false,
  adjustment,
}: {
  src?: string;
  alt: string;
  caption: string;
  missing?: boolean;
  adjustment?: PageAdjustment;
}) {
  void caption;
  void missing;
  if (adjustment?.imageHidden) return <figure className="image-page image-page-hidden" aria-label="画像を非表示にしています" />;
  const imageSize = adjustment?.imageSize || "medium";
  const imageAlign = adjustment?.imageAlign || "center";
  const imagePosition = adjustment?.imagePosition || "center";
  const spacingTop = adjustment?.imageSpacingTop || "normal";
  const spacingBottom = adjustment?.imageSpacingBottom || "normal";
  return (
    <figure className={`image-page image-page-size-${imageSize} image-page-align-${imageAlign} image-page-position-${imagePosition} image-page-spacing-top-${spacingTop} image-page-spacing-bottom-${spacingBottom}`}>
      <div className="image-page-content">
        <div className="image-frame">
          {src ? <ReaderImage src={src} alt={alt} /> : <div className="image-fallback">IMAGE</div>}
        </div>
      </div>
    </figure>
  );
}
