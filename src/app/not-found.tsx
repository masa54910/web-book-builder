import HomeBackLink from "@/components/HomeBackLink";

export default function NotFound() {
  return (
    <main className="empty-reader-page">
      <section>
        <p className="maker-kicker">404</p>
        <h1>ページが見つかりません</h1>
        <p>URLが変更されたか、公開が停止されている可能性があります。</p>
        <HomeBackLink className="maker-primary-link" />
      </section>
    </main>
  );
}
