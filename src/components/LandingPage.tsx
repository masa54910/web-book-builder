"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { saveDraft } from "@/lib/browserBookStorage";
import Ver2Faq from "@/components/ver2/lp/Ver2Faq";
import Ver2FeatureStrip from "@/components/ver2/lp/Ver2FeatureStrip";
import Ver2FinalCta from "@/components/ver2/lp/Ver2FinalCta";
import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import Ver2Hero from "@/components/ver2/lp/Ver2Hero";
import Ver2HowItWorks from "@/components/ver2/lp/Ver2HowItWorks";
import styles from "@/components/ver2/lp/Ver2Landing.module.css";
import Ver2Pricing from "@/components/ver2/lp/Ver2Pricing";
import Ver2PromotionCenter from "@/components/ver2/lp/Ver2PromotionCenter";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [heroText, setHeroText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [status, setStatus] = useState("");

  const activeText = useMemo(() => (heroText.trim() ? heroText : ctaText).trim(), [ctaText, heroText]);

  const startBookFlow = () => {
    const rawText = activeText;
    if (!rawText) {
      setStatus("文章を入力してから「Webブックを作る」を押してください。");
      return;
    }

    const saved = saveDraft({
      title: "新しいWebブック",
      subtitle: "",
      author: "",
      description: "",
      publisherName: "WebBookMaker",
      publishedAt: "",
      copyrightText: "",
      rawText,
      bindingDirection: "rtl",
      pageDensity: "standard",
      customCharactersPerPage: 380,
      tableOfContentsItemsPerPage: 6,
      theme: "classic",
    });

    if (!saved) {
      setStatus("下書きの保存に失敗しました。ブラウザの保存設定を確認してください。");
      return;
    }

    const next = "/books/new";
    if (user) {
      router.push(next);
      return;
    }
    router.push(`/signup?next=${encodeURIComponent(next)}`);
  };

  return (
    <div className={styles.page}>
      <Ver2Header />
      <main>
        <Ver2Hero heroText={heroText} onHeroTextChange={setHeroText} onStart={startBookFlow} status={status} />
        <Ver2FeatureStrip />
        <Ver2HowItWorks />
        <Ver2PromotionCenter />
        <Ver2Pricing />
        <Ver2FinalCta ctaText={ctaText} onCtaTextChange={setCtaText} onStart={startBookFlow} status={status} />
      </main>
      <Ver2Faq />
      <Ver2Footer />
    </div>
  );
}
