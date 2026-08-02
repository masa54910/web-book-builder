"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BETA_LIMITS } from "@/lib/limits";
import {
  buildBookProject,
  type UploadedBookImage,
  type BookProjectInput,
} from "@/lib/bookProject";
import { importManuscriptFile } from "@/lib/fileImport";
import { useAuth } from "@/lib/auth/AuthContext";
import { getBook, saveBook, updatePublication, type CloudBookRecord } from "@/lib/bookRepository";
import { deleteDraft, loadDraft, savePreviewProject } from "@/lib/browserBookStorage";
import { uploadBookProjectAssets } from "@/lib/bookAssetStorage";
import { createSlugCandidate, validateSlug } from "@/lib/slug";
import { trackEvent } from "@/lib/analytics";
import { normalizeHandle, safeExternalUrl, type ExternalLink, type ThemeId } from "@/lib/productTypes";
import { localeLabels, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/localization";
import { themePresets, type BookThemeSettings } from "@/lib/themeSystem";
import CharacterAssistant from "@/components/CharacterAssistant";

type EditorState = {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  rawText: string;
  coverImage?: string;
  coverFileName?: string;
  bindingDirection: "rtl" | "ltr";
  theme: ThemeId;
  language: SupportedLocale;
  fontFamily: BookThemeSettings["fontFamily"];
  fontScale: BookThemeSettings["fontScale"];
  marginScale: BookThemeSettings["marginScale"];
  pageWidth: BookThemeSettings["pageWidth"];
  background: BookThemeSettings["background"];
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "published" | "archived";
  slug: string;
  authorHandle: string;
  authorBio: string;
  authorWebsiteUrl: string;
  authorXUrl: string;
  authorNoteUrl: string;
  externalLinkLabel: string;
  externalLinkUrl: string;
  externalSalesUrl: string;
  externalSalesLabel: string;
};

const INITIAL_EDITOR: EditorState = {
  title: "",
  subtitle: "",
  author: "",
  description: "",
  publisherName: "WebBookMaker",
  publishedAt: "",
  copyrightText: "",
  rawText: "",
  bindingDirection: "rtl",
  theme: "classic",
  language: "ja",
  fontFamily: "mincho",
  fontScale: "medium",
  marginScale: "standard",
  pageWidth: "standard",
  background: "paper",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  visibility: "private",
  status: "draft",
  slug: "",
  authorHandle: "",
  authorBio: "",
  authorWebsiteUrl: "",
  authorXUrl: "",
  authorNoteUrl: "",
  externalLinkLabel: "",
  externalLinkUrl: "",
  externalSalesUrl: "",
  externalSalesLabel: "",
};

function initialStateFromDraft(mode: "new" | "edit") {
  if (mode !== "new" || typeof window === "undefined") {
    return { state: INITIAL_EDITOR, restored: false };
  }
  const draft = loadDraft();
  if (!draft) {
    return { state: INITIAL_EDITOR, restored: false };
  }

  const fields = draft.fields;
  const rawText = typeof fields.rawText === "string" ? fields.rawText : "";
  if (!rawText.trim()) {
    return { state: INITIAL_EDITOR, restored: false };
  }

  deleteDraft();
  return {
    state: {
      ...INITIAL_EDITOR,
      title: typeof fields.title === "string" && fields.title ? fields.title : INITIAL_EDITOR.title,
      subtitle: typeof fields.subtitle === "string" ? fields.subtitle : INITIAL_EDITOR.subtitle,
      author: typeof fields.author === "string" ? fields.author : INITIAL_EDITOR.author,
      description:
        typeof fields.description === "string" ? fields.description : INITIAL_EDITOR.description,
      publisherName:
        typeof fields.publisherName === "string" && fields.publisherName
          ? fields.publisherName
          : INITIAL_EDITOR.publisherName,
      publishedAt:
        typeof fields.publishedAt === "string" ? fields.publishedAt : INITIAL_EDITOR.publishedAt,
      copyrightText:
        typeof fields.copyrightText === "string"
          ? fields.copyrightText
          : INITIAL_EDITOR.copyrightText,
      rawText,
    },
    restored: true,
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function imageIdFromName(fileName: string, used: Set<string>) {
  const base =
    fileName
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function isImageFile(file: File) {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return (
    BETA_LIMITS.allowedImageTypes.includes(file.type as never) &&
    BETA_LIMITS.allowedImageExtensions.includes(extension as never) &&
    file.size <= BETA_LIMITS.maxImageBytes
  );
}

function fromRecord(record: CloudBookRecord): EditorState {
  return {
    title: record.title,
    subtitle: record.subtitle,
    author: record.authorName,
    description: record.description,
    publisherName: record.publisher,
    publishedAt: record.publishedAt,
    copyrightText: record.copyright,
    rawText: record.rawText,
    coverImage: record.bookProject.config.coverImage,
    coverFileName: record.coverPath ? "保存済み表紙" : undefined,
    bindingDirection: record.bindingDirection,
    theme: record.theme,
    language: record.bookProject.config.language,
    fontFamily: record.bookProject.config.themeSettings?.fontFamily || "mincho",
    fontScale: record.bookProject.config.themeSettings?.fontScale || "medium",
    marginScale: record.bookProject.config.themeSettings?.marginScale || "standard",
    pageWidth: record.bookProject.config.themeSettings?.pageWidth || "standard",
    background: record.bookProject.config.themeSettings?.background || "paper",
    charactersPerPage: record.charactersPerPage,
    tableOfContentsItemsPerPage: record.tocItemsPerPage,
    visibility: record.visibility,
    status: record.status,
    slug: record.slug,
    authorHandle: record.authorHandle || record.bookProject.config.authorProfile?.handle || "",
    authorBio: record.bookProject.config.authorProfile?.bio || "",
    authorWebsiteUrl: record.bookProject.config.authorProfile?.websiteUrl || "",
    authorXUrl: record.bookProject.config.authorProfile?.snsLinks.find((link) => link.label === "X")?.url || "",
    authorNoteUrl: record.bookProject.config.authorProfile?.snsLinks.find((link) => link.type === "note")?.url || "",
    externalLinkLabel: record.bookProject.config.externalLinks?.[0]?.label || "",
    externalLinkUrl: record.bookProject.config.externalLinks?.[0]?.url || "",
    externalSalesUrl: record.bookProject.config.monetization?.externalSalesUrl || "",
    externalSalesLabel: record.bookProject.config.monetization?.externalSalesLabel || "",
  };
}

function imagesFromRecord(record: CloudBookRecord): UploadedBookImage[] {
  return record.bookProject.images.map((image, index) => ({
    id: image.image_id || image.image_index || `image-${index + 1}`,
    fileName: image.alt || image.source_path || `image-${index + 1}`,
    dataUrl: image.image_url,
    mimeType: image.image_url.startsWith("data:image/png")
      ? "image/png"
      : image.image_url.startsWith("data:image/webp")
        ? "image/webp"
        : "image/jpeg",
    size: 0,
    caption: image.caption,
    insertChapter: image.chapter_order ? String(image.chapter_order) : "",
    orderInChapter: index + 1,
  }));
}

export default function DashboardBookEditor({ mode }: { mode: "new" | "edit" }) {
  const [draftSeed] = useState(() => initialStateFromDraft(mode));
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const manuscriptInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [bookId, setBookId] = useState<string | undefined>(params.id);
  const [state, setState] = useState<EditorState>(draftSeed.state);
  const [images, setImages] = useState<UploadedBookImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    draftSeed.restored ? "LPで入力した下書きを復元しました。続きから編集できます。" : "",
  );
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !params.id || !user) return;
    let active = true;
    getBook(params.id, user.id)
      .then((book) => {
        if (!active) return;
        if (!book) {
          setStatusMessage("作品が見つからないか、アクセス権がありません。");
          return;
        }
        setState(fromRecord(book));
        setBookId(book.id);
        setImages(imagesFromRecord(book));
      })
      .catch(() => setStatusMessage("作品を読み込めませんでした。"))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, params.id, user]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const chapterOptions = useMemo(
    () =>
      [...state.rawText.matchAll(/^# (?!#)([^\n]+)$/gm)].map((match, index) => ({
        value: String(index + 1),
        label: match[1].trim() || `第${index + 1}章`,
      })),
    [state.rawText],
  );

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((current) => ({
      ...current,
      [key]: value,
      slug: key === "title" && !current.slug ? createSlugCandidate(String(value)) : current.slug,
    }));
    setDirty(true);
  };

  const buildInput = (): BookProjectInput => ({
    title: state.title,
    subtitle: state.subtitle,
    author: state.author,
    description: state.description,
    publisherName: state.publisherName,
    publishedAt: state.publishedAt,
    copyrightText: state.copyrightText,
    rawText: state.rawText,
    coverImage: state.coverImage,
    bindingDirection: state.bindingDirection,
    theme: state.theme,
    language: state.language,
    themeSettings: {
      fontFamily: state.fontFamily,
      fontScale: state.fontScale,
      marginScale: state.marginScale,
      pageWidth: state.pageWidth,
      background: state.background,
    },
    charactersPerPage: state.charactersPerPage,
    tableOfContentsItemsPerPage: state.tableOfContentsItemsPerPage,
    images,
    authorHandle: state.authorHandle,
    authorBio: state.authorBio,
    authorWebsiteUrl: state.authorWebsiteUrl,
    authorXUrl: state.authorXUrl,
    authorNoteUrl: state.authorNoteUrl,
    externalLinks:
      state.externalLinkUrl && safeExternalUrl(state.externalLinkUrl)
        ? ([
            {
              id: "creator-link-1",
              type: "other",
              label: state.externalLinkLabel || "外部リンク",
              url: safeExternalUrl(state.externalLinkUrl),
            },
          ] satisfies ExternalLink[])
        : [],
    externalSalesUrl: state.externalSalesUrl,
    externalSalesLabel: state.externalSalesLabel,
    existingBookId: bookId,
  });

  const buildProject = () => {
    const result = buildBookProject(buildInput());
    if (!result.ok) {
      setErrors(result.errors);
      return null;
    }
    if (state.slug && validateSlug(state.slug)) {
      setErrors({ slug: validateSlug(state.slug) });
      return null;
    }
    setErrors({});
    return result.project;
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    if (state.rawText && !window.confirm("現在の本文を読み込みファイルで上書きします。よろしいですか？")) {
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = "";
      return;
    }
    try {
      const imported = await importManuscriptFile(file);
      setState((current) => ({
        ...current,
        rawText: imported.text,
        title: current.title || imported.title || current.title,
        description: current.description || imported.description || current.description,
      }));
      setWarnings(imported.warnings);
      setStatusMessage(`${file.name} を読み込みました。`);
      setDirty(true);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    } finally {
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = "";
    }
  };

  const handleCover = async (file?: File) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatusMessage("表紙画像はJPEG / PNG / WebP、10MBまでです。SVGは利用できません。");
      return;
    }
    update("coverImage", await fileToDataUrl(file));
    update("coverFileName", file.name);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const used = new Set(images.map((image) => image.id));
    const next: UploadedBookImage[] = [];
    const nextWarnings: string[] = [];
    for (const file of Array.from(files)) {
      if (!isImageFile(file)) {
        nextWarnings.push(`${file.name}: JPEG / PNG / WebP、10MBまでです。`);
        continue;
      }
      if (images.length + next.length >= BETA_LIMITS.maxImagesPerBook) {
        nextWarnings.push(`画像は最大${BETA_LIMITS.maxImagesPerBook}枚までです。`);
        break;
      }
      next.push({
        id: imageIdFromName(file.name, used),
        fileName: file.name,
        dataUrl: await fileToDataUrl(file),
        mimeType: file.type,
        size: file.size,
        caption: "",
        insertChapter: chapterOptions[0]?.value ?? "",
        orderInChapter: images.length + next.length + 1,
      });
    }
    setImages((current) => [...current, ...next]);
    setWarnings(nextWarnings);
    setDirty(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const updateImage = (
    imageId: string,
    patch: Partial<Pick<UploadedBookImage, "id" | "caption" | "insertChapter" | "orderInChapter">>,
  ) => {
    setImages((current) =>
      current.map((image) => (image.id === imageId ? { ...image, ...patch } : image)),
    );
    setDirty(true);
  };

  const removeImage = (imageId: string) => {
    setImages((current) => current.filter((image) => image.id !== imageId));
    setDirty(true);
  };

  const save = async () => {
    if (!user) return null;
    const project = buildProject();
    if (!project) return null;
    setIsSaving(true);
    try {
      const projectWithAssets = await uploadBookProjectAssets(project, user.id);
      const record = await saveBook(projectWithAssets, user.id, bookId, state.slug || undefined);
      setBookId(record.id);
      setState((current) => ({ ...current, slug: record.slug, status: record.status, visibility: record.visibility }));
      setDirty(false);
      setStatusMessage("保存しました。");
      trackEvent("book_saved", { bookId: record.id });
      if (mode === "new") router.replace(`/dashboard/books/${record.id}/edit`);
      return record;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "保存に失敗しました。");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const preview = async () => {
    const project = buildProject();
    if (!project) return;
    await savePreviewProject(project);
    router.push("/reader");
  };

  const publish = async () => {
    if (!user) return;
    const saved = await save();
    const id = saved?.id ?? bookId;
    if (!id) return;
    const nextVisibility = state.visibility === "private" ? "unlisted" : state.visibility;
    try {
      const record = await updatePublication(id, user.id, {
        status: "published",
        visibility: nextVisibility,
        slug: state.slug || createSlugCandidate(state.title),
      });
      setState((current) => ({ ...current, status: record.status, visibility: record.visibility, slug: record.slug }));
      setStatusMessage(`公開しました: /books/${record.slug}`);
      trackEvent("book_published", { bookId: record.id });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "公開に失敗しました。");
    }
  };

  const unpublish = async () => {
    if (!user || !bookId) return;
    const record = await updatePublication(bookId, user.id, { status: "draft", visibility: "private" });
    setState((current) => ({ ...current, status: record.status, visibility: record.visibility }));
    setStatusMessage("公開を停止しました。");
  };

  if (isLoading) return <div className="reader-loading">作品を読み込んでいます…</div>;

  return (
    <main className="dashboard-page editor-page">
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">Book editor</p>
          <h1>{mode === "new" ? "新しい作品" : "作品を編集"}</h1>
          <p>ベータ制限：最大5作品、本文20万文字、画像30枚、画像10MBまで。</p>
        </div>
        <div className="maker-actions">
          <button className="maker-primary-button" type="button" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? "保存中…" : "保存"}
          </button>
          <button className="maker-secondary-button" type="button" onClick={() => void publish()}>
            公開
          </button>
          <Link className="maker-secondary-link" href="/dashboard">
            作品一覧へ
          </Link>
        </div>
      </div>

      <CharacterAssistant event={statusMessage.includes("失敗") ? "error" : dirty ? "welcome" : "save"} compact />

      <section className="editor-workbench">
        <div className="editor-main-column">
        <div className="maker-card">
          <h2>基本情報</h2>
          <div className="maker-grid">
            <label>
              <span>タイトル 必須</span>
              <input value={state.title} onChange={(event) => update("title", event.target.value)} />
              {errors.title ? <small className="form-error">{errors.title}</small> : null}
            </label>
            <label>
              <span>著者名 必須</span>
              <input value={state.author} onChange={(event) => update("author", event.target.value)} />
              {errors.author ? <small className="form-error">{errors.author}</small> : null}
            </label>
            <label>
              <span>サブタイトル</span>
              <input value={state.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
            </label>
            <label>
              <span>公開URL slug</span>
              <input value={state.slug} onChange={(event) => update("slug", createSlugCandidate(event.target.value))} />
              {errors.slug ? <small className="form-error">{errors.slug}</small> : null}
            </label>
          </div>
          <label className="maker-full">
            <span>説明文</span>
            <textarea rows={3} value={state.description} onChange={(event) => update("description", event.target.value)} />
          </label>
        </div>

        <div className="maker-card">
          <h2>作者ページ</h2>
          <p className="maker-note">公開作品は作者ページから一覧表示できます。例：/authors/mako</p>
          <div className="maker-grid">
            <label>
              <span>作者ハンドル</span>
              <input
                value={state.authorHandle}
                placeholder="@mako"
                onChange={(event) => update("authorHandle", normalizeHandle(event.target.value, ""))}
              />
            </label>
            <label>
              <span>ホームページ</span>
              <input value={state.authorWebsiteUrl} onChange={(event) => update("authorWebsiteUrl", event.target.value)} placeholder="https://example.com" />
            </label>
            <label>
              <span>X</span>
              <input value={state.authorXUrl} onChange={(event) => update("authorXUrl", event.target.value)} placeholder="https://x.com/..." />
            </label>
            <label>
              <span>note</span>
              <input value={state.authorNoteUrl} onChange={(event) => update("authorNoteUrl", event.target.value)} placeholder="https://note.com/..." />
            </label>
          </div>
          <label className="maker-full">
            <span>自己紹介</span>
            <textarea rows={3} value={state.authorBio} onChange={(event) => update("authorBio", event.target.value)} />
          </label>
        </div>

        <div className="maker-card">
          <h2>原稿</h2>
          <label>
            <span>TXT / Markdown / Word / ZIPを読み込む</span>
            <input
              ref={manuscriptInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,.zip"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </label>
          <label>
            <span>本文 必須</span>
            <textarea
              className="manuscript-input"
              value={state.rawText}
              onChange={(event) => update("rawText", event.target.value)}
              placeholder="# 第一章　はじまり"
            />
            {errors.rawText ? <small className="form-error">{errors.rawText}</small> : null}
          </label>
        </div>
        </div>

        <aside className="editor-side-column" aria-label="リアルタイムプレビューと設定">
          <section className="maker-card live-preview-card">
            <p className="maker-kicker">Realtime preview</p>
            <h2>{state.title || "無題のWebブック"}</h2>
            <p>{state.description || "説明文を入力すると、公開時の紹介文として使われます。"}</p>
            <div className={`mini-book-preview theme-${state.theme} book-bg-${state.background} book-font-${state.fontFamily}`}>
              <strong>{state.title || "TITLE"}</strong>
              <span>{state.author || "Author"}</span>
              <p>{state.rawText.replace(/^# .+$/gm, "").trim().slice(0, 110) || "本文のプレビューがここに表示されます。"}</p>
            </div>
          </section>

        <div className="maker-card">
          <h2>画像</h2>
          <div className="cover-picker">
            <div className="cover-preview">
              {state.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.coverImage} alt="表紙プレビュー" />
              ) : (
                <span>Default Cover</span>
              )}
            </div>
            <div>
              <label>
                <span>表紙画像</span>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleCover(event.target.files?.[0])} />
              </label>
              {state.coverFileName ? <p className="maker-note">選択中：{state.coverFileName}</p> : null}
              <button className="maker-small-button" type="button" onClick={() => {
                update("coverImage", undefined);
                update("coverFileName", undefined);
              }}>
                表紙を解除
              </button>
            </div>
          </div>
          <label className="maker-full">
            <span>本文画像</span>
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handleImages(event.target.files)} />
          </label>
          {images.length ? (
            <div className="body-image-list">
              {images.map((image) => (
                <article className="body-image-item" key={image.id}>
                  <div className="body-image-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.dataUrl} alt={image.fileName} />
                  </div>
                  <label>
                    <span>画像ID</span>
                    <input value={image.id} onChange={(event) => updateImage(image.id, { id: event.target.value.trim() })} />
                  </label>
                  <label>
                    <span>キャプション</span>
                    <input value={image.caption} onChange={(event) => updateImage(image.id, { caption: event.target.value })} />
                  </label>
                  <label>
                    <span>挿入先の章</span>
                    <select value={image.insertChapter} onChange={(event) => updateImage(image.id, { insertChapter: event.target.value })}>
                      <option value="">本文記法のみ</option>
                      {chapterOptions.map((chapter) => (
                        <option key={chapter.value} value={chapter.value}>{chapter.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>章内での順序</span>
                    <input type="number" min={1} value={image.orderInChapter} onChange={(event) => updateImage(image.id, { orderInChapter: Number(event.target.value) || 1 })} />
                  </label>
                  <p className="maker-note">挿入記法：<code>{`[[image:${image.id}]]`}</code></p>
                  <button className="maker-small-button danger" type="button" onClick={() => removeImage(image.id)}>
                    削除
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="maker-note">保存済み画像はBookProject内に保持されます。新しい画像を追加できます。</p>
          )}
        </div>

        <div className="maker-card">
          <h2>デザイン・公開設定</h2>
          <div className="maker-grid">
            <label>
              <span>UI言語</span>
              <select value={state.language} onChange={(event) => update("language", event.target.value as SupportedLocale)}>
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>{localeLabels[locale]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>綴じ方向</span>
              <select value={state.bindingDirection} onChange={(event) => update("bindingDirection", event.target.value as "rtl" | "ltr")}>
                <option value="rtl">右綴じ</option>
                <option value="ltr">左綴じ</option>
              </select>
            </label>
            <label>
              <span>テーマ</span>
              <select value={state.theme} onChange={(event) => update("theme", event.target.value as ThemeId)}>
                {themePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}{preset.plan === "plus" ? "（Plus）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>フォント</span>
              <select value={state.fontFamily} onChange={(event) => update("fontFamily", event.target.value as BookThemeSettings["fontFamily"])}>
                <option value="mincho">明朝</option>
                <option value="gothic">ゴシック</option>
                <option value="serif">Serif</option>
                <option value="sans">Sans</option>
              </select>
            </label>
            <label>
              <span>文字サイズ</span>
              <select value={state.fontScale} onChange={(event) => update("fontScale", event.target.value as BookThemeSettings["fontScale"])}>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </label>
            <label>
              <span>余白</span>
              <select value={state.marginScale} onChange={(event) => update("marginScale", event.target.value as BookThemeSettings["marginScale"])}>
                <option value="compact">狭め</option>
                <option value="standard">標準</option>
                <option value="wide">広め</option>
              </select>
            </label>
            <label>
              <span>ページ幅</span>
              <select value={state.pageWidth} onChange={(event) => update("pageWidth", event.target.value as BookThemeSettings["pageWidth"])}>
                <option value="narrow">狭め</option>
                <option value="standard">標準</option>
                <option value="wide">広め</option>
              </select>
            </label>
            <label>
              <span>背景</span>
              <select value={state.background} onChange={(event) => update("background", event.target.value as BookThemeSettings["background"])}>
                <option value="paper">紙</option>
                <option value="ivory">アイボリー</option>
                <option value="cafe">カフェ</option>
                <option value="green">グリーン</option>
                <option value="night">ナイト</option>
              </select>
            </label>
            <label>
              <span>ページ文字量</span>
              <input type="number" min={180} max={1200} value={state.charactersPerPage} onChange={(event) => update("charactersPerPage", Number(event.target.value) || 380)} />
            </label>
            <label>
              <span>目次項目数</span>
              <input type="number" min={1} max={20} value={state.tableOfContentsItemsPerPage} onChange={(event) => update("tableOfContentsItemsPerPage", Number(event.target.value) || 6)} />
            </label>
            <label>
              <span>公開範囲</span>
              <select value={state.visibility} onChange={(event) => update("visibility", event.target.value as "private" | "unlisted" | "public")}>
                <option value="private">非公開</option>
                <option value="unlisted">限定公開</option>
                <option value="public">公開</option>
              </select>
            </label>
          </div>
          <div className="maker-grid external-link-grid">
            <label>
              <span>作品末尾に表示する外部リンク名</span>
              <input value={state.externalLinkLabel} onChange={(event) => update("externalLinkLabel", event.target.value)} placeholder="Kindle / note / 講座 / お問い合わせ など" />
            </label>
            <label>
              <span>作品末尾に表示する外部リンクURL</span>
              <input value={state.externalLinkUrl} onChange={(event) => update("externalLinkUrl", event.target.value)} placeholder="https://..." />
            </label>
            <label>
              <span>外部販売ページ名</span>
              <input value={state.externalSalesLabel} onChange={(event) => update("externalSalesLabel", event.target.value)} placeholder="購入ページ / 応援ページ など" />
            </label>
            <label>
              <span>外部販売ページURL</span>
              <input value={state.externalSalesUrl} onChange={(event) => update("externalSalesUrl", event.target.value)} placeholder="https://..." />
            </label>
          </div>
          <p className="maker-note">WebBookMakerは決済に関与しません。販売や応援は外部URLへの導線として扱います。</p>
        </div>
        </aside>
      </section>

      {warnings.length ? <div className="maker-warning">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {statusMessage ? <p className="maker-status" aria-live="polite">{statusMessage}</p> : null}

      <div className="maker-actions sticky-actions">
        <button className="maker-primary-button" type="button" disabled={isSaving} onClick={() => void save()}>
          {isSaving ? "保存中…" : "保存"}
        </button>
        <button className="maker-secondary-button" type="button" onClick={() => void preview()}>
          プレビュー
        </button>
        <button className="maker-secondary-button" type="button" onClick={() => void publish()}>
          公開する
        </button>
        {state.status === "published" ? (
          <button className="maker-secondary-button danger" type="button" onClick={() => void unpublish()}>
            公開停止
          </button>
        ) : null}
      </div>
    </main>
  );
}
