import AppHeader from "@/components/AppHeader";

export default function ContactPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Contact</p>
        <h1>お問い合わせ</h1>
        <p>ベータ版のため、問い合わせフォームは未実装です。限定ベータ開始前に運営メール、削除依頼先、著作権侵害申告先、または外部フォームを設定してください。</p>
      </article>
    </main>
  );
}
