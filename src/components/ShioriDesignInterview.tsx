"use client";

import { useMemo, useState } from "react";
import { buildShioriDesignBrief, createInitialShioriAnswers, SHIORI_CATEGORY_LABELS, summarizeShioriBrief, type ShioriAnswers, type ShioriCategory, type ShioriDesignBrief } from "@/lib/shioriDesignBrief";

type Props = { onCancel: () => void; onConfirm: (brief: ShioriDesignBrief) => void; initialBrief?: ShioriDesignBrief | null };
type Question = { key: keyof ShioriAnswers; label: string; options: string[] };

const common: Question[] = [
  { key: "category", label: "どんな種類の本ですか？", options: Object.keys(SHIORI_CATEGORY_LABELS) as ShioriCategory[] },
  { key: "audience", label: "主な読者はどなたですか？", options: ["初心者・はじめての方", "専門知識のある方", "子ども・学生", "幅広い読者"] },
  { key: "tone", label: "どんな雰囲気にしますか？", options: ["親しみやすく柔らかい", "信頼感のある端正な", "都会的でスタイリッシュ", "落ち着いた上品な"] },
  { key: "contentBalance", label: "文章と画像のバランスは？", options: ["文章を主役に", "文章と画像を半々に", "画像を主役に"] },
  { key: "density", label: "ページの読み心地は？", options: ["情報をコンパクトに", "標準的で読みやすく", "余白を広くゆったり"] },
  { key: "cover", label: "表紙はどの方向がよいですか？", options: ["タイトルを大きく", "画像を主役に", "余白を活かして上品に", "内容が一目で伝わる"] },
  { key: "brightness", label: "全体の明るさは？", options: ["明るく軽やか", "自然でニュートラル", "深みのある落ち着き"] },
  { key: "decoration", label: "装飾の量は？", options: ["最小限でシンプル", "控えめなアクセント", "見出しや区切りを印象的に"] },
  { key: "emphasis", label: "特に目立たせたい要素は？", options: ["章タイトル", "要点・まとめ", "写真・図表", "著者のメッセージ"] },
  { key: "avoid", label: "避けたい印象は？", options: ["読みにくい dense な印象", "派手すぎる印象", "冷たく無機質な印象", "特にありません"] },
];

const genreOptions: Partial<Record<ShioriCategory, Question[]>> = {
  education: [{ key: "genreDetails", label: "教材で重視することは？", options: ["手順のわかりやすさ", "用語の整理", "練習・振り返り"] }],
  business: [{ key: "genreDetails", label: "実用書で重視することは？", options: ["結論の早さ", "事例の豊富さ", "データの信頼感"] }],
  novel: [{ key: "genreDetails", label: "小説の読後感は？", options: ["静かで余韻のある", "軽快で現代的", "温かく親密な"] }],
  essay: [{ key: "genreDetails", label: "文章の見せ方は？", options: ["語りかけるように", "文学的に", "日記のように"] }],
  magazine: [{ key: "genreDetails", label: "特集の見せ方は？", options: ["見出しのメリハリ", "写真と記事のリズム", "情報をすっきり整理"] }],
  photo_book: [{ key: "genreDetails", label: "写真の見せ方は？", options: ["大きく全面に", "余白を活かして", "文章と組み合わせて"] }],
};

export function ShioriDesignInterview({ onCancel, onConfirm, initialBrief }: Props) {
  const [answers, setAnswers] = useState<ShioriAnswers>(() => initialBrief ? { ...initialBrief, genreDetails: { ...initialBrief.genreDetails } } : createInitialShioriAnswers());
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(Boolean(initialBrief));
  const questions = useMemo(() => [...common, ...(answers.category ? (genreOptions[answers.category] || []) : [])], [answers.category]);
  const brief = buildShioriDesignBrief(answers);
  const current = questions[step];
  const choose = (value: string) => {
    setAnswers((prev) => current.key === "category"
      ? { ...prev, category: value as ShioriCategory }
      : current.key === "genreDetails"
        ? { ...prev, genreDetails: { ...prev.genreDetails, [prev.category || "other"]: value } }
        : { ...prev, [current.key]: value });
    if (step < questions.length - 1) setStep(step + 1); else setTimeout(() => setConfirmed(true), 0);
  };
  if (confirmed && brief) return <div className="shiori-interview" role="dialog" aria-modal="true" aria-labelledby="shiori-summary-title"><div className="shiori-heading"><img className="shiori-avatar-image" src="/shiori/character-sheet.png" alt="" /><div className="shiori-avatar" aria-hidden="true">しおり</div></div><h3 id="shiori-summary-title">この内容でデザイン方針を作ります</h3><p className="shiori-summary">{summarizeShioriBrief(brief)}</p><div className="maker-actions"><button className="maker-primary-button" type="button" onClick={() => onConfirm(brief)}>この方針でデザインする</button><button className="maker-secondary-button" type="button" onClick={() => { setConfirmed(false); setStep(Math.max(0, questions.length - 1)); }}>回答を修正する</button><button className="maker-secondary-button" type="button" onClick={onCancel}>キャンセル</button></div><p className="maker-note">本文・章・画像・販売設定は変更されません。縦書きは現在のProduction仕様では対象外です。</p></div>;
  if (!current) return null;
  return <div className="shiori-interview" role="dialog" aria-modal="true" aria-labelledby="shiori-question-title"><div className="shiori-heading"><img className="shiori-avatar-image" src="/shiori/character-sheet.png" alt="" /><div className="shiori-avatar" aria-hidden="true">しおり</div></div><div className="shiori-progress">質問 {step + 1} / {questions.length}</div><h3 id="shiori-question-title">{current.label}</h3><div className="shiori-options">{current.options.map((option) => <button className="shiori-option" key={option} type="button" onClick={() => choose(option)}>{current.key === "category" ? SHIORI_CATEGORY_LABELS[option as ShioriCategory] : option}</button>)}</div><div className="maker-actions"><button className="maker-secondary-button" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>戻る</button><button className="maker-secondary-button" type="button" onClick={() => { setAnswers(createInitialShioriAnswers()); setStep(0); setConfirmed(false); }}>最初からやり直す</button><button className="maker-secondary-button" type="button" onClick={onCancel}>キャンセル</button></div></div>;
}
