"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./ArticleReveal.module.css";

type ArticleRevealProps = {
  children: ReactNode;
};

export default function ArticleReveal({ children }: ArticleRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const hashTarget = window.location.hash
      ? document.getElementById(window.location.hash.slice(1))
      : null;
    if (hashTarget && element.contains(hashTarget)) {
      element.classList.add(styles.revealVisible);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add(styles.revealVisible);
      return;
    }

    element.classList.add(styles.revealReady);

    if (!("IntersectionObserver" in window)) {
      element.classList.add(styles.revealVisible);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.classList.add(styles.revealVisible);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={elementRef} className={styles.reveal}>
      {children}
    </div>
  );
}
