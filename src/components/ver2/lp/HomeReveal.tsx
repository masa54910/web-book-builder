"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./Ver2Landing.module.css";

type Props = {
  children: ReactNode;
};

/**
 * Adds a repeatable reveal to below-the-fold Home content without hiding it
 * when JavaScript is unavailable. The visual effect only uses opacity and a
 * small transform, so it does not change document flow or introduce layout
 * shift.
 */
export default function HomeReveal({ children }: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.classList.add(styles.homeRevealReady);

    if (!("IntersectionObserver" in window)) {
      element.classList.add(styles.homeRevealVisible);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        element.classList.toggle(styles.homeRevealVisible, entry.isIntersecting);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={styles.homeReveal}
    >
      {children}
    </div>
  );
}
