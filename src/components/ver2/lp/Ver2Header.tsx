"use client";

import Link from "next/link";
import { useState } from "react";

import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "./Ver2Landing.module.css";

export default function Ver2Header() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const loginHref = user ? "/dashboard" : "/login";

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

        <button className={styles.menuToggle} aria-label="メニューを開く" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          ☰
        </button>

        <nav className={`${styles.mainNav} ${open ? styles.mainNavOpen : ""}`}>
          <Link href="/#samples">作り方</Link>
          <Link href="/pricing">料金プラン</Link>
          <Link href="/#promotion">作品を広める</Link>
          <Link href="/#faq">よくある質問</Link>
          {isLoading ? (
            <span className={`${styles.navBtn} ${styles.navBtnLoading}`} aria-disabled="true">ログイン</span>
          ) : (
            <Link className={styles.navBtn} href={loginHref}>ログイン</Link>
          )}
          <Link
            className={`${styles.navBtn} ${styles.navBtnPrimary}`}
            href={user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew"}
          >
            はじめる
          </Link>
        </nav>
      </div>
    </header>
  );
}
