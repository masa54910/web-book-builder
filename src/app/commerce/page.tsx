import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function CommercePage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Commerce</p>
        <HomeBackLink />
        <h1>特定商取引法に基づく表記（ベータ版ドラフト）</h1>
        <p>
          WebBookMakerは現在、決済機能を提供していません。販売・課金は外部販売ページへのリンクとして扱い、
          WebBookMakerは決済や売上分配に関与しません。
        </p>
        <p>
          正式公開前に、運営者名、所在地、連絡先、販売条件、返金条件などの表記を確定し、専門家確認を行ってください。
        </p>
      </article>
    </main>
  );
}
