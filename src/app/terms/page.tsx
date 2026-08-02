import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Terms</p>
        <HomeBackLink />
        <h1>利用規約（ベータ版ドラフト）</h1>
        <p>WebBookMakerは、ユーザー自身の原稿からWeb書籍を作成・保存・公開するためのベータサービスです。</p>
        <p>この文書はベータ版ドラフトです。正式公開前に運営者情報を確定し、専門家確認を行ってください。</p>
        <h2>ベータ版とバックアップ</h2>
        <p>ベータ期間中は予告なく仕様変更やデータ調整を行う場合があります。重要な原稿・画像は必ずユーザー自身でもバックアップしてください。</p>
        <h2>ユーザーコンテンツ</h2>
        <p>投稿・保存する本文、画像、メタデータの権利と責任はユーザーに帰属します。第三者の権利を侵害する素材は利用できません。</p>
        <h2>禁止事項</h2>
        <p>違法、有害、権利侵害、マルウェア、スパム、なりすまし、過度な負荷を与える利用を禁止します。</p>
        <h2>外部リンクと販売</h2>
        <p>WebBookMakerは外部販売・決済・取引の当事者ではありません。外部リンク先での購入、契約、問い合わせはリンク先サービスの条件に従います。</p>
        <h2>公開停止</h2>
        <p>権利侵害や安全上の問題がある場合、運営者は公開停止や削除対応を行うことがあります。</p>
        <h2>問い合わせ・削除依頼</h2>
        <p>問い合わせ先、削除依頼先、著作権侵害申告先は限定ベータ開始前に確定してください。</p>
      </article>
    </main>
  );
}
