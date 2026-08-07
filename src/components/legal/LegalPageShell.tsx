import type { ReactNode } from "react";

import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

type Props = {
  kicker: string;
  title: string;
  titleClassName?: string;
  children: ReactNode;
};

export default function LegalPageShell({ kicker, title, titleClassName, children }: Props) {
  return (
    <main className="legal-page">
      <AppHeader />
      <article className="maker-card">
        <p className="maker-kicker">{kicker}</p>
        <HomeBackLink />
        <h1 className={titleClassName}>{title}</h1>
        <p className="legal-effective-date">
          制定日：2026年8月7日
          <br />
          最終更新日：2026年8月7日
        </p>
        {children}
        <HomeBackLink
          destination="home"
          label="ホームへ戻る"
          className="legal-bottom-home-link maker-secondary-link"
        />
      </article>
    </main>
  );
}
