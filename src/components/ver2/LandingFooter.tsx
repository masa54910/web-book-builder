import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-emerald-900/10 bg-white/85">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-8 text-sm text-slate-600 md:grid-cols-3 md:items-center md:px-6">
        <p className="font-semibold text-slate-700">WebBookMaker</p>
        <nav className="flex flex-wrap gap-4 md:justify-center">
          <a href="#howto">作り方</a>
          <a href="#sample">サンプル</a>
          <a href="#pricing">料金プラン</a>
          <a href="#faq">FAQ</a>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシー</Link>
        </nav>
        <div className="md:text-right">support@webbookmaker.app</div>
      </div>
      <p className="pb-6 text-center text-xs text-slate-500">© 2026 WebBookMaker</p>
    </footer>
  );
}
