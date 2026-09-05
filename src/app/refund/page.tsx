import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Refund</p>
        <HomeBackLink />
        <h1>返金・キャンセル方針</h1>
        <h2>出版プラン（¥980 / 1作品）</h2>
        <p>購入後のユーザー都合による返金は原則行いません。ただし、二重決済、WebBookMaker側の重大な不具合によりサービス提供ができない場合、WebBookMakerが返金相当と判断した場合、または法令上必要な場合はこの限りではありません。</p>
        <h2>運用プラン（¥1,980 / 月）</h2>
        <p>運用プランはいつでも解約できます。解約は現在の請求期間終了時に有効となり、支払済み期間終了までは利用できます。解約後の次回自動更新はありません。日割り返金は原則行いませんが、上記の例外条件を適用します。</p>
        <p>解約は、ログイン後の設定画面にある「プランを管理」からStripe Customer Portalを開いて行います。ご不明点は<Link href="/contact">お問い合わせフォーム</Link>からご連絡ください。</p>
        <HomeBackLink
          destination="home"
          label="ホームへ戻る"
          className="legal-bottom-home-link maker-secondary-link"
        />
      </article>
    </main>
  );
}
