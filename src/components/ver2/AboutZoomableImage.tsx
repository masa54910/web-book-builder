"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import styles from "./AboutWebBookMakerPage.module.css";

type AboutZoomableImageProps = {
  src: string;
  alt: string;
  sizes: string;
  width: number;
  height: number;
  zoomScale?: "half";
};

export default function AboutZoomableImage({ src, alt, sizes, width, height, zoomScale }: AboutZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lightboxImageClassName = `${styles.imageLightboxImage}${zoomScale === "half" ? ` ${styles.imageLightboxImageHalf}` : ""}`;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={styles.zoomableImage}
        onClick={() => setIsOpen(true)}
        aria-label={`${alt}を拡大表示`}
      >
        <Image src={src} alt={alt} fill sizes={sizes} />
        <span className={styles.zoomHint} aria-hidden="true">クリックで拡大</span>
      </button>

      {isOpen ? (
        <div
          className={styles.imageLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt}の拡大表示`}
          onClick={() => setIsOpen(false)}
        >
          <div className={styles.imageLightboxContent} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.imageLightboxClose} onClick={() => setIsOpen(false)} aria-label="拡大表示を閉じる">×</button>
            <Image className={lightboxImageClassName} src={src} alt={alt} width={width} height={height} sizes={zoomScale === "half" ? "46vw" : "92vw"} priority />
          </div>
        </div>
      ) : null}
    </>
  );
}
