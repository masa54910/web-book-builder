import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-reader-page">
      <section>
        <p className="maker-kicker">404</p>
        <h1>ページが見つかりません</h1>
        <p>URLが変更されたか、公開が停止されている可能性があります。</p>
        <Link className="maker-primary-link" href="/">
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}
