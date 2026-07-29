import Image from "next/image";

function ReaderImage({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 760px) 100vw, 50vw"
      style={{ objectFit: "contain" }}
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
