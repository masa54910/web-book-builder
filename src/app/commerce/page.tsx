import LegalPageShell from "@/components/legal/LegalPageShell";
import Link from "next/link";

export default function CommercePage() {
  return (
    <LegalPageShell kicker="Commerce" title="特定商取引法に基づく表記" titleClassName="legal-title-commercial">
      <p>WebBookMakerは、Web上で文章や画像からデジタルブックを作成・公開できるサービスです。</p>
      <p>WebBookMakerでは、作品公開のための出版プランと、複数作品を継続運用するための運用プランを提供しています。購入前に料金ページとCheckout開始前の確認画面で条件を表示します。</p>

      <dl className="legal-definition-list">
        <div><dt>販売事業者</dt><dd>販売事業者の氏名、住所および電話番号は、請求があった場合、遅滞なく開示します。開示を希望する場合は<Link href="/contact">お問い合わせフォーム</Link>からご連絡ください。</dd></div>
        <div><dt>運営責任者</dt><dd>販売事業者の氏名、住所および電話番号は、請求があった場合、遅滞なく開示します。</dd></div>
        <div><dt>所在地・電話番号</dt><dd>請求があった場合、遅滞なく開示します。</dd></div>
        <div><dt>連絡先</dt><dd><Link href="/contact">お問い合わせフォーム</Link></dd></div>
        <div><dt>販売価格</dt><dd>出版プランは税込¥980 / 1作品、運用プランは税込¥1,980 / 月です。購入前の料金ページおよびCheckout開始前画面にも表示します。</dd></div>
        <div><dt>販売価格以外の必要料金</dt><dd>インターネット接続料金、通信料金等はユーザーの負担となります。</dd></div>
        <div><dt>支払方法・支払時期</dt><dd>Stripe Checkoutによる決済を、購入申込み時に行います。利用可能な支払方法はCheckout画面に表示します。</dd></div>
        <div><dt>サービス提供時期</dt><dd>決済確認後、出版プランは対象作品の公開機能を、運用プランは契約期間中の運用機能を利用できます。</dd></div>
        <div><dt>解約</dt><dd>運用プランはWebBookMakerの「プランを管理」からStripe Customer Portalを開き、いつでも解約できます。解約は現在の請求期間終了時に有効となり、支払済み期間終了までは利用できます。</dd></div>
        <div><dt>返品・返金</dt><dd>購入後のユーザー都合による返金は原則行いません。ただし、二重決済、当社側の重大な不具合、当社が返金相当と判断した場合、または法令上必要な場合はこの限りではありません。運用プランの解約による日割り返金は原則行いません。</dd></div>
      </dl>

      <h2>表示内容の変更</h2>
      <p>有料プランの内容、価格、提供時期その他の条件を変更した場合は、変更後の購入画面および本ページに反映します。表示について問い合わせがある場合は、上記連絡先までご連絡ください。</p>
    </LegalPageShell>
  );
}
