"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BindingDirection, BookTheme } from "@/config/bookConfig";
import {
  buildBookProject,
  type BookProjectInput,
  type UploadedBookImage,
} from "@/lib/bookProject";
import {
  deleteDraft,
  loadDraft,
  saveDraft,
  savePreviewProject,
  type MakerDraft,
} from "@/lib/browserBookStorage";

type FormState = {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  rawText: string;
  bindingDirection: BindingDirection;
  pageDensity: "light" | "standard" | "dense" | "custom";
  customCharactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  theme: BookTheme;
  coverImage?: string;
  coverFileName?: string;
  existingBookId?: string;
  existingCreatedAt?: string;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_FORM: FormState = {
  title: "",
  subtitle: "",
  author: "",
  description: "",
  publisherName: "WebBookMaker",
  publishedAt: "",
  copyrightText: "",
  rawText: "",
  bindingDirection: "rtl",
  pageDensity: "standard",
  customCharactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  theme: "classic",
};

const SAMPLE_TEXT = `# 第一章　はじまり

ここに本文を書きます。会話や余白を残したい場合は、通常の改行をそのまま入力してください。

[[image:town-night]]

参考URL
https://example.com/web-book-maker/sample

# 第二章　新しい町

ここに次の章の本文を書きます。

## 小見出し

小見出しは本文ページ内でそのまま表示されます。`;

function charactersPerPageFor(state: FormState) {
  if (state.pageDensity === "light") return 280;
  if (state.pageDensity === "dense") return 520;
  if (state.pageDensity === "custom") return Math.max(180, state.customCharactersPerPage || 380);
  return 380;
}

function toDraftFields(state: FormState, images: UploadedBookImage[]) {
  return {
    ...state,
    coverImage: undefined,
    coverFileName: state.coverFileName,
    bodyImageMetadata: images.map((image) => ({
      id: image.id,
      fileName: image.fileName,
      mimeType: image.mimeType,
      size: image.size,
      caption: image.caption,
      insertChapter: image.insertChapter,
      orderInChapter: image.orderInChapter,
    })),
  };
}

function formFromDraft(draft: MakerDraft): FormState {
  const fields = draft.fields;
  const merged = { ...DEFAULT_FORM, ...fields };
  return {
    ...merged,
    title: typeof merged.title === "string" ? merged.title : "",
    subtitle: typeof merged.subtitle === "string" ? merged.subtitle : "",
    author: typeof merged.author === "string" ? merged.author : "",
    description: typeof merged.description === "string" ? merged.description : "",
    publisherName: typeof merged.publisherName === "string" ? merged.publisherName : "WebBookMaker",
    publishedAt: typeof merged.publishedAt === "string" ? merged.publishedAt : "",
    copyrightText: typeof merged.copyrightText === "string" ? merged.copyrightText : "",
    rawText: typeof merged.rawText === "string" ? merged.rawText : "",
    bindingDirection: merged.bindingDirection === "ltr" ? "ltr" : "rtl",
    pageDensity:
      merged.pageDensity === "light" ||
      merged.pageDensity === "dense" ||
      merged.pageDensity === "custom"
        ? merged.pageDensity
        : "standard",
    customCharactersPerPage:
      typeof merged.customCharactersPerPage === "number" ? merged.customCharactersPerPage : 380,
    tableOfContentsItemsPerPage:
      typeof merged.tableOfContentsItemsPerPage === "number"
        ? merged.tableOfContentsItemsPerPage
        : 6,
    theme:
      merged.theme === "modern" || merged.theme === "minimal" || merged.theme === "classic"
        ? merged.theme
        : "classic",
    coverImage: undefined,
    coverFileName: undefined,
  };
}

function slugForImageId(fileName: string, used: Set<string>) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const base =
    baseName
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File) {
  const extensionOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || !extensionOk) {
    return "JPEG / PNG / WebP の画像を選択してください。";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "10MBを超える画像は大きすぎます。軽量化してから選択してください。";
  }
  return "";
}

export default function BookMakerForm() {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [bodyImages, setBodyImages] = useState<UploadedBookImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [isDraftChecked, setIsDraftChecked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const draft = loadDraft();
      if (draft) {
        setForm(formFromDraft(draft));
        setLastDraftSavedAt(draft.savedAt);
        setStatus("保存済み下書きを復元しました。画像は再選択してください。");
      }
      setIsDraftChecked(true);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const chapterOptions = useMemo(() => {
    return [...form.rawText.matchAll(/^# (?!#)([^\n]+)$/gm)].map((match, index) => ({
      value: String(index + 1),
      label: match[1].trim() || `第${index + 1}章`,
    }));
  }, [form.rawText]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleCoverImage = async (file?: File) => {
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      setErrors((current) => ({ ...current, coverImage: error }));
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateField("coverImage", dataUrl);
    updateField("coverFileName", file.name);
    setWarnings((current) => current.filter((warning) => !warning.includes("表紙画像")));
  };

  const clearCoverImage = () => {
    updateField("coverImage", undefined);
    updateField("coverFileName", undefined);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const addBodyImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const usedIds = new Set(bodyImages.map((image) => image.id));
    const nextImages: UploadedBookImage[] = [];
    const nextWarnings: string[] = [];

    for (const file of Array.from(files)) {
      const error = validateImageFile(file);
      if (error) {
        nextWarnings.push(`${file.name}: ${error}`);
        continue;
      }
      nextImages.push({
        id: slugForImageId(file.name, usedIds),
        fileName: file.name,
        dataUrl: await fileToDataUrl(file),
        mimeType: file.type,
        size: file.size,
        caption: "",
        insertChapter: chapterOptions[0]?.value ?? "",
        orderInChapter: bodyImages.length + nextImages.length + 1,
      });
    }

    setBodyImages((current) => [...current, ...nextImages]);
    setWarnings(nextWarnings);
    if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
  };

  const updateBodyImage = (
    imageId: string,
    patch: Partial<Pick<UploadedBookImage, "id" | "caption" | "insertChapter" | "orderInChapter">>,
  ) => {
    setBodyImages((current) =>
      current.map((image) => (image.id === imageId ? { ...image, ...patch } : image)),
    );
  };

  const removeBodyImage = (imageId: string) => {
    setBodyImages((current) => current.filter((image) => image.id !== imageId));
  };

  const restoreDraft = () => {
    const draft = loadDraft();
    if (!draft) {
      setStatus("復元できる下書きがありません。");
      return;
    }
    setForm(formFromDraft(draft));
    setBodyImages([]);
    setLastDraftSavedAt(draft.savedAt);
    setStatus("下書きを復元しました。画像は再選択してください。");
  };

  const handleSaveDraft = () => {
    const saved = saveDraft(toDraftFields(form, bodyImages));
    if (!saved) {
      setStatus("下書きを保存できませんでした。ブラウザの保存設定を確認してください。");
      return;
    }
    setLastDraftSavedAt(saved.savedAt);
    setStatus("下書きを保存しました。画像ファイルは保存されないため、必要に応じて再選択してください。");
  };

  const handleDeleteDraft = () => {
    deleteDraft();
    setLastDraftSavedAt(null);
    setStatus("下書きを削除しました。");
  };

  const handleReset = () => {
    if (!window.confirm("入力内容をリセットします。よろしいですか？")) return;
    setForm(DEFAULT_FORM);
    setBodyImages([]);
    setErrors({});
    setWarnings([]);
    setStatus("入力内容をリセットしました。");
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
  };

  const applySampleText = () => {
    setForm((current) => ({
      ...current,
      title: current.title || "サンプルWebブック",
      subtitle: current.subtitle || "Preview Draft",
      author: current.author || "あなたの名前",
      description: current.description || "WebBookMakerの入力例です。",
      rawText: SAMPLE_TEXT,
    }));
    setStatus("サンプル本文を入力しました。");
  };

  const buildInput = (): BookProjectInput => ({
    title: form.title,
    subtitle: form.subtitle,
    author: form.author,
    description: form.description,
    publisherName: form.publisherName,
    publishedAt: form.publishedAt,
    copyrightText: form.copyrightText,
    rawText: form.rawText,
    coverImage: form.coverImage,
    bindingDirection: form.bindingDirection,
    theme: form.theme,
    charactersPerPage: charactersPerPageFor(form),
    tableOfContentsItemsPerPage: form.tableOfContentsItemsPerPage,
    images: bodyImages,
    existingBookId: form.existingBookId,
    existingCreatedAt: form.existingCreatedAt,
  });

  const createPreview = async () => {
    setIsGenerating(true);
    setStatus("");
    const result = buildBookProject(buildInput());
    if (!result.ok) {
      setErrors(result.errors);
      setIsGenerating(false);
      return;
    }

    try {
      await savePreviewProject(result.project);
      saveDraft({
        ...toDraftFields({ ...form, existingBookId: result.project.config.bookId, existingCreatedAt: result.project.createdAt }, bodyImages),
      });
      router.push("/reader");
    } catch {
      setStatus("プレビュー保存に失敗しました。ブラウザの保存容量を確認してください。");
      setIsGenerating(false);
    }
  };

  return (
    <main className="maker-page">
      <header className="maker-hero">
        <div>
          <p className="maker-kicker">WebBookMaker</p>
          <h1>あなたの文章を、読まれるWeb書籍に。</h1>
          <p>文章を貼り付けるだけで、表紙・目次・ページめくり付きのWebブックを作成できます。</p>
        </div>
        <Link className="maker-secondary-link" href="/sample">
          サンプルWeb書籍を見る
        </Link>
      </header>

      <form className="maker-form" onSubmit={(event) => event.preventDefault()}>
        <section className="maker-card">
          <h2>基本情報</h2>
          <div className="maker-grid">
            <label>
              <span>タイトル 必須</span>
              <input data-testid="maker-title" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
              {errors.title ? <small className="form-error">{errors.title}</small> : null}
            </label>
            <label>
              <span>サブタイトル</span>
              <input value={form.subtitle} onChange={(event) => updateField("subtitle", event.target.value)} />
            </label>
            <label>
              <span>著者名 必須</span>
              <input data-testid="maker-author" value={form.author} onChange={(event) => updateField("author", event.target.value)} />
              {errors.author ? <small className="form-error">{errors.author}</small> : null}
            </label>
            <label>
              <span>出版社名</span>
              <input value={form.publisherName} onChange={(event) => updateField("publisherName", event.target.value)} />
            </label>
            <label>
              <span>公開日</span>
              <input value={form.publishedAt} onChange={(event) => updateField("publishedAt", event.target.value)} />
            </label>
            <label>
              <span>著作権表記</span>
              <input value={form.copyrightText} onChange={(event) => updateField("copyrightText", event.target.value)} />
            </label>
          </div>
          <label className="maker-full">
            <span>説明文</span>
            <textarea rows={3} value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>
        </section>

        <section className="maker-card maker-text-card">
          <div className="maker-section-heading">
            <div>
              <h2>本文</h2>
              <p># は章見出し、## は小見出しとして扱います。見出しがない場合は本文全体を1章にします。</p>
            </div>
            <button className="maker-small-button" type="button" onClick={applySampleText}>
              サンプル本文を入力
            </button>
          </div>
          <label>
            <span>本文 必須</span>
            <textarea
              className="manuscript-input"
              data-testid="maker-raw-text"
              value={form.rawText}
              onChange={(event) => updateField("rawText", event.target.value)}
              placeholder={"# 第一章　はじまり\n\nここに本文を書きます。\n\n# 第二章　新しい町\n\nここに次の章の本文を書きます。"}
            />
            {errors.rawText ? <small className="form-error">{errors.rawText}</small> : null}
          </label>
          <div className="maker-example" aria-label="入力例">
            <strong>入力例</strong>
            <pre>{`# 第一章　はじまり\n\nここに本文を書きます。\n\n# 第二章　新しい町\n\nここに次の章の本文を書きます。`}</pre>
          </div>
        </section>

        <section className="maker-card">
          <h2>表紙設定</h2>
          <div className="cover-picker">
            <div className="cover-preview" aria-label="表紙プレビュー">
              {form.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImage} alt="選択した表紙画像のプレビュー" />
              ) : (
                <span>Default Cover</span>
              )}
            </div>
            <div>
              <label>
                <span>表紙画像（JPEG / PNG / WebP、10MBまで）</span>
                <input
                  ref={coverInputRef}
                  data-testid="maker-cover-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleCoverImage(event.target.files?.[0])}
                />
              </label>
              {form.coverFileName ? <p className="maker-note">選択中：{form.coverFileName}</p> : null}
              {errors.coverImage ? <small className="form-error">{errors.coverImage}</small> : null}
              <button className="maker-small-button" type="button" onClick={clearCoverImage}>
                表紙画像を解除
              </button>
            </div>
          </div>
        </section>

        <section className="maker-card">
          <h2>本文画像設定</h2>
          <p className="maker-note">本文中に <code>[[image:画像ID]]</code> と書くと、その位置に画像を挿入します。</p>
          <label>
            <span>本文画像を追加（複数選択可）</span>
            <input
              ref={bodyImageInputRef}
              data-testid="maker-body-images-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => addBodyImages(event.target.files)}
            />
          </label>
          {bodyImages.length ? (
            <div className="body-image-list">
              {bodyImages.map((image) => (
                <article className="body-image-item" key={image.id}>
                  <div className="body-image-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.dataUrl} alt={image.fileName} />
                  </div>
                  <label>
                    <span>画像ID</span>
                    <input value={image.id} onChange={(event) => updateBodyImage(image.id, { id: event.target.value.trim() })} />
                  </label>
                  <label>
                    <span>キャプション</span>
                    <input value={image.caption} onChange={(event) => updateBodyImage(image.id, { caption: event.target.value })} />
                  </label>
                  <label>
                    <span>挿入先の章</span>
                    <select value={image.insertChapter} onChange={(event) => updateBodyImage(image.id, { insertChapter: event.target.value })}>
                      <option value="">未指定</option>
                      {chapterOptions.map((chapter) => (
                        <option value={chapter.value} key={chapter.value}>
                          {chapter.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>章内での順序</span>
                    <input
                      type="number"
                      min={1}
                      value={image.orderInChapter}
                      onChange={(event) => updateBodyImage(image.id, { orderInChapter: Number(event.target.value) || 1 })}
                    />
                  </label>
                  <p className="maker-note">挿入記法：<code>{`[[image:${image.id}]]`}</code></p>
                  <button className="maker-small-button danger" type="button" onClick={() => removeBodyImage(image.id)}>
                    削除
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="maker-note">本文画像はまだ登録されていません。</p>
          )}
        </section>

        <section className="maker-card">
          <h2>レイアウト設定</h2>
          <div className="maker-grid">
            <label>
              <span>綴じ方向</span>
              <select data-testid="maker-binding-direction" value={form.bindingDirection} onChange={(event) => updateField("bindingDirection", event.target.value as BindingDirection)}>
                <option value="rtl">右綴じ</option>
                <option value="ltr">左綴じ</option>
              </select>
            </label>
            <label>
              <span>ページ文字量</span>
              <select data-testid="maker-page-density" value={form.pageDensity} onChange={(event) => updateField("pageDensity", event.target.value as FormState["pageDensity"])}>
                <option value="light">少なめ</option>
                <option value="standard">標準</option>
                <option value="dense">多め</option>
                <option value="custom">詳細数値入力</option>
              </select>
            </label>
            <label>
              <span>詳細文字量</span>
              <input
                type="number"
                data-testid="maker-custom-characters"
                min={180}
                max={1200}
                value={form.customCharactersPerPage}
                disabled={form.pageDensity !== "custom"}
                onChange={(event) => updateField("customCharactersPerPage", Number(event.target.value) || 380)}
              />
            </label>
            <label>
              <span>目次1ページあたりの項目数</span>
              <input
                type="number"
                data-testid="maker-toc-count"
                min={1}
                max={20}
                value={form.tableOfContentsItemsPerPage}
                onChange={(event) => updateField("tableOfContentsItemsPerPage", Number(event.target.value) || 6)}
              />
            </label>
            <label>
              <span>テーマ</span>
              <select data-testid="maker-theme" value={form.theme} onChange={(event) => updateField("theme", event.target.value as BookTheme)}>
                <option value="classic">classic</option>
                <option value="modern">modern</option>
                <option value="minimal">minimal</option>
              </select>
            </label>
          </div>
        </section>

        {warnings.length ? (
          <section className="maker-warning" aria-live="polite">
            <h2>確認事項</h2>
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </section>
        ) : null}

        {status ? <p className="maker-status" aria-live="polite">{status}</p> : null}

        <div className="maker-actions">
          <button className="maker-primary-button" data-testid="maker-create-preview" type="button" onClick={createPreview} disabled={isGenerating}>
            {isGenerating ? "生成中…" : "プレビューを作成"}
          </button>
          <button className="maker-secondary-button" data-testid="maker-save-draft" type="button" onClick={handleSaveDraft}>
            下書きを保存
          </button>
          <button className="maker-secondary-button" type="button" onClick={restoreDraft}>
            保存済み下書きを復元
          </button>
          <button className="maker-secondary-button" type="button" onClick={handleDeleteDraft}>
            下書きを削除
          </button>
          <button className="maker-secondary-button danger" type="button" onClick={handleReset}>
            入力をリセット
          </button>
        </div>

        <p className="maker-note">
          最終保存日時：
          {!isDraftChecked
            ? "確認中"
            : lastDraftSavedAt
              ? new Date(lastDraftSavedAt).toLocaleString("ja-JP")
              : "未保存"}
          。下書き保存はテキストと設定のみです。画像は再読み込み後に再選択してください。
        </p>
      </form>
    </main>
  );
}
