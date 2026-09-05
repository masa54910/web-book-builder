import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Contact</p>
        <HomeBackLink />
        <h1>お問い合わせ</h1>
        <ContactForm />
        <HomeBackLink
          destination="home"
          label="ホームへ戻る"
          className="legal-bottom-home-link maker-secondary-link"
        />
      </article>
    </main>
  );
}
