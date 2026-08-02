"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import styles from "@/components/demo/DemoPages.module.css";

export default function DemoTopActions({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const startHref = user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew";

  return (
    <div className={`${styles.topActions} ${floating ? styles.topActionsFloating : ""}`}>
      <Link className="auth-home-link" href="/">
        ← ホームへ戻る
      </Link>
      <Link className="maker-primary-link" href={startHref}>
        無料ではじめる
      </Link>
    </div>
  );
}
