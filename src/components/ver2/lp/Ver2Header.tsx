"use client";

import Link from "next/link";
import { type MouseEvent, useRef, useState } from "react";

import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "./Ver2Landing.module.css";
import LanguageSelector from "@/components/LanguageSelector";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";

export default function Ver2Header() {
  const { user, isLoading } = useAuth();
  const { locale } = useUiLocale();
  const [open, setOpen] = useState(false);
  const scrollFrameRef = useRef<number | null>(null);
  const loginHref = user ? "/dashboard" : "/login";

  const handleSectionNavigation = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (window.location.pathname !== "/") {
      setOpen(false);
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) return;

    event.preventDefault();
    setOpen(false);

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const startY = window.scrollY;
    const targetY = Math.max(0, startY + target.getBoundingClientRect().top - headerHeight - 16);
    const distance = targetY - startY;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const finishNavigation = () => {
      scrollFrameRef.current = null;
      window.history.pushState(null, "", `/#${sectionId}`);
    };

    if (reducedMotion) {
      window.scrollTo({ top: targetY, behavior: "auto" });
      finishNavigation();
      return;
    }

    const duration = Math.min(460, Math.max(320, Math.abs(distance) / 8));
    const startedAt = window.performance.now();

    const animateScroll = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        scrollFrameRef.current = window.requestAnimationFrame(animateScroll);
      } else {
        finishNavigation();
      }
    };

    scrollFrameRef.current = window.requestAnimationFrame(animateScroll);
  };

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.nav}`}>
        <BrandLogo
          href="/"
          className={styles.brand}
          iconClassName={styles.logoIcon}
          svgClassName={styles.logoTablet}
          copyClassName={styles.logoCopy}
          wordClassName={styles.logoWord}
          taglineClassName={styles.logoTagline}
        />

        <button className={styles.menuToggle} aria-label={locale === "en" ? "Open menu" : "メニューを開く"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          ☰
        </button>

        <nav className={`${styles.mainNav} ${open ? styles.mainNavOpen : ""}`}>
          <Link href="/#samples" onClick={(event) => handleSectionNavigation(event, "samples")}>{uiT(locale, "navigation.howItWorks")}</Link>
          <Link href="/pricing">{uiT(locale, "navigation.pricing")}</Link>
          <Link href="/#promotion" onClick={(event) => handleSectionNavigation(event, "promotion")}>{uiT(locale, "navigation.promotion")}</Link>
          <Link href="/#faq" onClick={(event) => handleSectionNavigation(event, "faq")}>{uiT(locale, "navigation.faq")}</Link>
          {isLoading ? (
            <span className={`${styles.navBtn} ${styles.navBtnLoading}`} aria-disabled="true">{uiT(locale, "navigation.login")}</span>
          ) : (
            <Link className={styles.navBtn} href={loginHref}>{uiT(locale, "navigation.login")}</Link>
          )}
          <Link
            className={`${styles.navBtn} ${styles.navBtnPrimary}`}
            href={user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew"}
          >
            {uiT(locale, "navigation.start")}
          </Link>
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}
