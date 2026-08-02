import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Privacy</p>
        <HomeBackLink />
        <h1>プライバシーポリシー（ベータ版ドラフト）</h1>
        <p>ログイン、作品保存、公開URL提供のために、メールアドレス、作品データ、閲覧補助データを扱います。</p>
        <p>この文書はベータ版ドラフトです。正式公開前に運営者情報を確定し、専門家確認を行ってください。</p>
        <h2>保存データ</h2>
        <p>作品本文・画像・設定・公開状態は、ユーザーごとに分離して保存します。Preview/ProductionではSupabaseに保存し、ローカルデモ時のみブラウザ内に保存されます。</p>
        <h2>閲覧解析</h2>
        <p>公開作品では閲覧開始、読了率、共有、外部リンククリック等の集計イベントを保存します。本文内容、読者メールアドレス、生IPアドレス、不要な端末指紋は保存しません。</p>
        <h2>Cookie / localStorage</h2>
        <p>ログイン状態、読書位置、付箋、下書き保存のためにブラウザ保存領域を利用します。</p>
        <h2>削除依頼</h2>
        <p>削除依頼の連絡先は限定ベータ開始前に確定してください。</p>
      </article>
    </main>
  );
}
