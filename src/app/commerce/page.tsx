import LegalPageShell from "@/components/legal/LegalPageShell";

export default function CommercePage() {
  return (
    <LegalPageShell kicker="Commerce" title="特定商取引法に基づく表記">
      <p>WebBookMakerは、Web上で文章や画像からデジタルブックを作成・公開できるサービスです。</p>
      <p>現在はベータ版として無料機能を提供しており、有料プランおよび決済機能は正式提供前です。有料機能を開始する場合は、購入前の画面および本ページを更新し、条件を明示します。</p>

      <dl className="legal-definition-list">
        <div><dt>販売事業者</dt><dd>WebBookMaker運営者</dd></div>
        <div><dt>運営責任者</dt><dd>WebBookMaker運営者</dd></div>
        <div><dt>所在地</dt><dd>請求があった場合、遅滞なく開示します。</dd></div>
        <div><dt>連絡先</dt><dd><a href="mailto:support@webbookmaker.app">support@webbookmaker.app</a></dd></div>
        <div><dt>販売価格</dt><dd>有料機能を提供する場合、各料金ページまたは購入画面に税込価格を表示します。現在、決済を伴う有料機能は提供していません。</dd></div>
        <div><dt>販売価格以外の必要料金</dt><dd>インターネット接続料金、通信料金等はユーザーの負担となります。</dd></div>
        <div><dt>支払方法・支払時期</dt><dd>有料機能の提供開始時に、利用可能な決済方法および支払時期を購入画面へ表示します。</dd></div>
        <div><dt>サービス提供時期</dt><dd>決済および利用開始の確認後、購入画面に表示する時期に提供します。現在は無料機能を登録後すぐに利用できます。</dd></div>
        <div><dt>解約</dt><dd>継続課金を導入する場合、購入画面またはアカウント画面に解約方法と効力発生日を表示します。</dd></div>
        <div><dt>返品・返金</dt><dd>デジタルサービスの性質上、提供開始後の返金は、法令上必要な場合または別途表示する場合を除き行わないことがあります。具体的な条件は有料機能の提供開始前に表示します。</dd></div>
      </dl>

      <h2>表示内容の変更</h2>
      <p>有料プランの内容、価格、提供時期その他の条件を変更した場合は、変更後の購入画面および本ページに反映します。表示について問い合わせがある場合は、上記連絡先までご連絡ください。</p>
    </LegalPageShell>
  );
}
