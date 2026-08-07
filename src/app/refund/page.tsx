import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function RefundPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Refund</p>
        <HomeBackLink />
        <h1>返金・キャンセル方針（ベータ版ドラフト）</h1>
        <p>
          現在のベータ版では、WebBookMaker内での課金・決済は有効化していません。
          そのため、WebBookMakerから請求・返金が発生することはありません。
        </p>
        <p>
          将来有料プランを提供する場合は、申込前に料金、更新、キャンセル、返金条件を明示します。
          外部販売ページでの購入は、各外部サービスの規約・返金条件に従います。
        </p>
        <HomeBackLink
          destination="home"
          label="ホームへ戻る"
          className="legal-bottom-home-link maker-secondary-link"
        />
      </article>
    </main>
  );
}
