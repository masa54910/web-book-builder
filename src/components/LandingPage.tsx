"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { saveDraft } from "@/lib/browserBookStorage";
import { buildReaderPages } from "@/lib/paginateText";
import { extractChaptersFromText } from "@/lib/bookProject";
import { importManuscriptFile } from "@/lib/fileImport";
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

type ComposerTarget = "hero" | "cta";

type AttachedFileSummary = {
  name: string;
  size: number;
  fingerprint: string;
};

type FlowEstimate = {
  rawText: string;
  pageCount: number;
  characterCount: number;
  fileNames: string[];
  isOverLimit: boolean;
};

const FREE_PAGE_LIMIT = 20;
const DEFAULT_CHARACTERS_PER_PAGE = 380;
const DEFAULT_TOC_ITEMS_PER_PAGE = 6;

function fileFingerprint(file: File, text: string) {
  return `${file.name}:${file.size}:${text.length}:${text.slice(0, 80)}`;
}

function mergeImportedText(currentText: string, fileName: string, importedText: string) {
  const trimmedCurrent = currentText.trimEnd();
  const trimmedImported = importedText.trim();
  const importedBlock = `# ${fileName.replace(/\.[^.]+$/, "")}\n\n${trimmedImported}`;
  return trimmedCurrent ? `${trimmedCurrent}\n\n${importedBlock}` : importedBlock;
}

function estimateReaderPages(rawText: string) {
  const chapters = extractChaptersFromText(rawText, "新しいWebブック");
  return buildReaderPages({
    chapters,
    images: [],
    charactersPerPage: DEFAULT_CHARACTERS_PER_PAGE,
    tableOfContentsItemsPerPage: DEFAULT_TOC_ITEMS_PER_PAGE,
  }).length;
}

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [heroText, setHeroText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [activeTarget, setActiveTarget] = useState<ComposerTarget>("hero");
  const [status, setStatus] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileSummary[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [flowEstimate, setFlowEstimate] = useState<FlowEstimate | null>(null);

  const activeText = useMemo(
    () => (activeTarget === "cta" ? ctaText : heroText).trim() || (heroText.trim() ? heroText : ctaText).trim(),
    [activeTarget, ctaText, heroText],
  );
  const attachedFileNames = useMemo(() => attachedFiles.map((file) => file.name), [attachedFiles]);

  const saveLandingDraft = (rawText: string, pageCount: number) => {
    return saveDraft({
      title: "新しいWebブック",
      subtitle: "",
      author: "",
      description: "",
      publisherName: "WebBookMaker",
      publishedAt: "",
      copyrightText: "",
      rawText,
      attachedFileNames,
      estimatedPageCount: pageCount,
      source: "landing",
      pendingFlow: "create-book",
      bindingDirection: "rtl",
      pageDensity: "standard",
      customCharactersPerPage: DEFAULT_CHARACTERS_PER_PAGE,
      tableOfContentsItemsPerPage: DEFAULT_TOC_ITEMS_PER_PAGE,
      theme: "classic",
    });
  };

  const continueBookFlow = (estimate: FlowEstimate) => {
    const saved = saveLandingDraft(estimate.rawText, estimate.pageCount);

    if (!saved) {
      setStatus("下書きの保存に失敗しました。ブラウザの保存設定を確認してください。");
      return;
    }

    setFlowEstimate(null);
    const next = "/books/new";
    if (user) {
      router.push(next);
      return;
    }
    router.push(`/signup?next=${encodeURIComponent(next)}`);
  };

  const startBookFlow = () => {
    const rawText = activeText;
    if (!rawText) {
      setStatus("文章を入力してから「Webブックを作る」を押してください。");
      return;
    }

    const pageCount = estimateReaderPages(rawText);
    setFlowEstimate({
      rawText,
      pageCount,
      characterCount: rawText.length,
      fileNames: attachedFileNames,
      isOverLimit: pageCount > FREE_PAGE_LIMIT,
    });
  };

  const importFile = async (file: File, target: ComposerTarget) => {
    setStatus("");
    setIsImporting(true);
    try {
      const imported = await importManuscriptFile(file);
      const text = imported.text.trim();
      if (!text) {
        setStatus("ファイルから本文を抽出できませんでした。別形式のファイルをお試しください。");
        return;
      }
      const fingerprint = fileFingerprint(file, text);
      if (attachedFiles.some((attached) => attached.fingerprint === fingerprint)) {
        setStatus(`${file.name} はすでに取り込み済みです。二重追加は行いませんでした。`);
        return;
      }
      setActiveTarget(target);
      const apply = target === "hero" ? setHeroText : setCtaText;
      apply((current) => mergeImportedText(current, file.name, text));
      setAttachedFiles((current) => [
        ...current,
        { name: file.name, size: file.size, fingerprint },
      ]);
      setStatus(
        imported.warnings.length
          ? `${file.name} を本文の末尾に追記しました。${imported.warnings.join(" ")}`
          : `${file.name} を本文の末尾に追記しました。`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    } finally {
      setIsImporting(false);
    }
  };

  const removeAttachedFile = (fingerprint: string) => {
    setAttachedFiles((current) => current.filter((file) => file.fingerprint !== fingerprint));
    setStatus("添付履歴から削除しました。本文に追記済みの内容は、必要に応じて入力欄で編集してください。");
  };

  const choosePlan = (plan: "publishing" | "writer") => {
    const saved = flowEstimate ? saveLandingDraft(flowEstimate.rawText, flowEstimate.pageCount) : null;
    if (!saved) {
      setStatus("入力内容の一時保存に失敗しました。文章をコピーしてから再度お試しください。");
      return;
    }
    setFlowEstimate(null);
    setStatus(
      plan === "publishing"
        ? "出版プランの案内へ移動します。現在ベータ版では決済は有効化していません。"
        : "作家プランの案内へ移動します。現在ベータ版では決済は有効化していません。",
    );
    router.push("/pricing");
  };

  return (
    <div className={styles.page}>
      <Ver2Header />
      <main>
        <Ver2Hero
          heroText={heroText}
          onHeroTextChange={(value) => {
            setActiveTarget("hero");
            setHeroText(value);
          }}
          onStart={startBookFlow}
          onFileSelected={(file) => void importFile(file, "hero")}
          attachedFiles={attachedFiles}
          onRemoveAttachedFile={removeAttachedFile}
          isImporting={isImporting}
          status={status}
        />
        <Ver2FeatureStrip />
        <Ver2HowItWorks />
        <Ver2PromotionCenter />
        <Ver2Pricing />
        <Ver2FinalCta
          ctaText={ctaText}
          onCtaTextChange={(value) => {
            setActiveTarget("cta");
            setCtaText(value);
          }}
          onStart={startBookFlow}
          onFileSelected={(file) => void importFile(file, "cta")}
          attachedFiles={attachedFiles}
          onRemoveAttachedFile={removeAttachedFile}
          isImporting={isImporting}
          status={status}
        />
      </main>
      <Ver2Faq />
      <Ver2Footer />
      {flowEstimate ? (
        <div className={styles.flowDialogBackdrop} role="presentation">
          <section
            className={styles.flowDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-flow-dialog-title"
          >
            <p className={styles.dialogKicker}>生成前の確認</p>
            <h2 id="book-flow-dialog-title">この内容でWebブックを作りますか？</h2>
            <div className={styles.dialogStats}>
              <span>推定ページ数：<strong>{flowEstimate.pageCount}</strong>ページ</span>
              <span>無料枠：{FREE_PAGE_LIMIT}ページまで</span>
              <span>入力文字数：{flowEstimate.characterCount.toLocaleString("ja-JP")}文字</span>
              <span>添付：{flowEstimate.fileNames.length ? flowEstimate.fileNames.join("、") : "なし"}</span>
            </div>
            <p>
              公開は自動では行われません。登録・ログイン後も入力内容を引き継ぎ、編集画面で表紙・テーマ・本文を確認できます。
            </p>
            {flowEstimate.isOverLimit ? (
              <div className={styles.dialogWarning}>
                無料枠を{flowEstimate.pageCount - FREE_PAGE_LIMIT}ページ超過しています。文章を減らすか、プランを選んでください。
              </div>
            ) : null}
            <div className={styles.dialogActions}>
              {flowEstimate.isOverLimit ? (
                <>
                  <button type="button" className={styles.dialogSecondary} onClick={() => setFlowEstimate(null)}>
                    入力へ戻る
                  </button>
                  <button type="button" className={styles.dialogSecondary} onClick={() => choosePlan("publishing")}>
                    出版プランを見る
                  </button>
                  <button type="button" className={styles.dialogPrimary} onClick={() => choosePlan("writer")}>
                    作家プランを見る
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.dialogSecondary} onClick={() => setFlowEstimate(null)}>
                    入力へ戻る
                  </button>
                  <button type="button" className={styles.dialogPrimary} onClick={() => continueBookFlow(flowEstimate)}>
                    この内容でWebブックを作る
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
