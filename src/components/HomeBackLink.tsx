"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HomeBackLink({ label = "← ホームへ戻る" }: { label?: string }) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/";
  const text = user ? "← TOPへ戻る" : label;

  return (
    <Link className="maker-secondary-link home-back-link" href={href}>
      {text}
    </Link>
  );
}
