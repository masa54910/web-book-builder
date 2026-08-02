import Link from "next/link";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function AuthorGuidePage() {
  return (
    <main className="dashboard-page public-info-page">
      <AppHeader />
      <section className="maker-card">
        <p className="maker-kicker">Author page</p>
        <HomeBackLink />
        <h1>作者ページについて</h1>
        <p>
          作品を公開すると、作者ハンドルごとのページに公開作品が自動で並びます。
          プロフィール設定で表示名・自己紹介・SNSリンクを整えてください。
        </p>
        <div className="maker-actions">
          <Link className="maker-primary-link" href="/dashboard/settings">
            プロフィールを設定する
          </Link>
          <Link className="maker-secondary-link" href="/dashboard">
            作品一覧へ
          </Link>
        </div>
      </section>
    </main>
  );
}
