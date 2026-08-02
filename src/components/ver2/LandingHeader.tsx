"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import BrandLogo from "@/components/ver2/BrandLogo";

export default function LandingHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-[rgba(255,253,249,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1440px] items-center justify-between gap-6 px-4 md:px-6">
        <BrandLogo />
        <button
          type="button"
          aria-label="メニューを開閉"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900/15 bg-white text-lg md:hidden"
        >
          {open ? "×" : "☰"}
        </button>
        <nav className="hidden items-center gap-3 text-sm font-bold text-slate-700 md:flex">
          <Link href="/#samples" className="rounded-full px-3 py-2 hover:bg-white/80">作り方</Link>
          <Link href="/sample" className="rounded-full px-3 py-2 hover:bg-white/80">サンプル</Link>
          <Link href="/pricing" className="rounded-full px-3 py-2 hover:bg-white/80">料金プラン</Link>
          <Link href="/#promotion" className="rounded-full px-3 py-2 hover:bg-white/80">作品を広める</Link>
          <Link href="/#faq" className="rounded-full px-3 py-2 hover:bg-white/80">FAQ</Link>
          <Link href="/login" className="rounded-full border border-[rgba(16,120,90,.12)] bg-[rgba(255,255,255,.82)] px-4 py-2 text-emerald-950 shadow-sm backdrop-blur">ログイン</Link>
          <Link href={user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew"} className="rounded-full bg-[#0D7A62] px-5 py-2 text-white shadow-sm transition-colors hover:bg-[#13906f]">はじめる</Link>
        </nav>
      </div>
      {open ? (
        <nav className="mx-4 mb-4 grid gap-2 rounded-2xl border border-emerald-900/10 bg-white p-4 text-sm font-bold text-slate-700 md:hidden">
          <Link href="/#samples" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-emerald-50">作り方</Link>
          <Link href="/sample" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-emerald-50">サンプル</Link>
          <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-emerald-50">料金プラン</Link>
          <Link href="/#promotion" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-emerald-50">作品を広める</Link>
          <Link href="/#faq" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-emerald-50">FAQ</Link>
          <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-[rgba(16,120,90,.12)] bg-[rgba(255,255,255,.82)] px-3 py-2 text-emerald-950">ログイン</Link>
          <Link href={user ? "/books/new" : "/signup?next=%2Fbooks%2Fnew"} onClick={() => setOpen(false)} className="rounded-xl bg-[#0D7A62] px-3 py-2 text-center text-white">はじめる</Link>
        </nav>
      ) : null}
    </header>
  );
}
