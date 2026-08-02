import Link from "next/link";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import ProtectedRoute from "@/components/ProtectedRoute";

function AnalyticsIndexPage() {
  return (
    <main className="dashboard-page public-info-page">
      <AppHeader />
      <section className="maker-card">
        <p className="maker-kicker">Analytics</p>
        <HomeBackLink />
        <h1>作品分析</h1>
        <p>
          作品ごとの閲覧数・読了率・共有数は、マイライブラリの各作品管理画面で確認できます。
          公開後の読者反応を見ながら、同じURLのまま作品を育てられます。
        </p>
        <Link className="maker-primary-link" href="/dashboard">
          マイライブラリで確認する
        </Link>
      </section>
    </main>
  );
}

export default function AnalyticsRoute() {
  return (
    <ProtectedRoute>
      <AnalyticsIndexPage />
    </ProtectedRoute>
  );
}
