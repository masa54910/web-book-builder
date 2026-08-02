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
  imageIndex,
  missing = false,
}: {
  src?: string;
  alt: string;
  caption: string;
  imageIndex: string;
  missing?: boolean;
}) {
  return (
    <figure className="image-page">
      <p className="editorial-label">Visual Record · {String(imageIndex).padStart(3, "0")}</p>
      <div className="image-frame">
        {src ? <ReaderImage src={src} alt={alt} /> : <div className="image-fallback">IMAGE {String(imageIndex).padStart(3, "0")}</div>}
      </div>
      {missing ? <p className="image-missing">画像ID「{imageIndex}」が登録されていません。</p> : null}
      {caption ? <figcaption className="image-caption">{caption}</figcaption> : null}
    </figure>
  );
}
