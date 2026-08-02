import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function GuidelinesPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Guidelines</p>
        <HomeBackLink />
        <h1>投稿ガイドライン（ベータ版）</h1>
        <p>WebBookMakerは、自分の文章を読者へ届くWeb作品として公開するためのサービスです。</p>
        <h2>公開できるもの</h2>
        <p>小説、エッセイ、教材、研究資料、旅行記、ポートフォリオなど、ユーザー自身が権利を持つ文章・画像を公開できます。</p>
        <h2>公開できないもの</h2>
        <p>違法、有害、権利侵害、個人情報の不適切な公開、なりすまし、マルウェア、スパム目的の作品は公開できません。</p>
        <h2>権利侵害への対応</h2>
        <p>権利侵害の申告があった場合、運営者は確認のうえ公開停止や削除を行うことがあります。</p>
      </article>
    </main>
  );
}
