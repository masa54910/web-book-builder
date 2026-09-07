import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";
import ContactForm from "@/components/ContactForm";
import LocalizedText from "@/components/LocalizedText";

export default function ContactPage() {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">Contact</p>
        <HomeBackLink />
        <h1><LocalizedText k="contact.title" /></h1>
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
