function ReaderImage({ src, alt }: { src: string; alt: string }) {
  // Use intrinsic sizing so portrait assets are never stretched to the frame.
  // eslint-disable-next-line @next/next/no-img-element
  return (
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
}: {
  src?: string;
  alt: string;
  caption: string;
  missing?: boolean;
}) {
  return (
    <figure className="image-page">
      <div className="image-page-content">
        <div className="image-frame">
          {src ? <ReaderImage src={src} alt={alt} /> : <div className="image-fallback">IMAGE</div>}
        </div>
        {caption.trim().length ? <figcaption className="image-caption">{caption}</figcaption> : null}
        {missing ? <p className="image-missing">画像IDが登録されていません。</p> : null}
      </div>
    </figure>
  );
}
