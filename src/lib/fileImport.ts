"use client";

import JSZip from "jszip";
import { BETA_LIMITS } from "@/lib/limits";

export type ImportedManuscript = {
  text: string;
  title?: string;
  description?: string;
  warnings: string[];
};

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".ps1",
  ".sh",
  ".js",
  ".mjs",
  ".vbs",
  ".scr",
  ".jar",
]);

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function validateZipPath(path: string) {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized.includes("..\\")) {
    return "ZIP内に危険なパスが含まれています。";
  }
  if (normalized.split("/").some((part) => part === ".." || part === "")) {
    return "ZIP内のパス構造が不正です。";
  }
  return "";
}

export function validateImportFile(file: File) {
  const extension = extensionOf(file.name);
  if (!BETA_LIMITS.allowedImportExtensions.includes(extension as never)) {
    return "対応形式は .txt / .md / .markdown / .docx / .pdf / .zip です。";
  }
  if (extension === ".zip" && file.size > BETA_LIMITS.maxZipBytes) {
    return "ZIPファイルは50MBまでです。";
  }
  if (extension !== ".zip" && file.size > BETA_LIMITS.maxTextBytes) {
    return "原稿ファイルが大きすぎます。";
  }
  return "";
}

async function readTextFile(file: File) {
  const buffer = await file.arrayBuffer();
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer).replace(/^\uFEFF/, "");
}

async function readDocxFile(file: File): Promise<ImportedManuscript> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return {
    text: result.value.trim(),
    warnings: result.messages.map((message) => message.message),
  };
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
}

function decodePdfHex(hex: string) {
  const normalized = hex.replace(/\s+/g, "");
  if (!normalized || normalized.length % 2 !== 0) return "";
  const bytes = normalized.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];
  if (!bytes.length) return "";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    }
    return output;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}

async function readPdfFile(file: File): Promise<ImportedManuscript> {
  const buffer = await file.arrayBuffer();
  const source = new TextDecoder("latin1", { fatal: false }).decode(buffer);
  const literalTexts = [...source.matchAll(/\((?:\\.|[^\\)]){2,}\)/g)]
    .map((match) => decodePdfLiteral(match[0].slice(1, -1)).trim())
    .filter((text) => /[\p{Letter}\p{Number}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text));
  const hexTexts = [...source.matchAll(/<([0-9A-Fa-f\s]{8,})>/g)]
    .map((match) => decodePdfHex(match[1]).trim())
    .filter((text) => /[\p{Letter}\p{Number}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text));
  const text = [...literalTexts, ...hexTexts]
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) {
    throw new Error("PDFから文字情報を抽出できませんでした。画像だけのPDFはベータ版ではOCR対象外です。");
  }
  return {
    text,
    warnings: ["PDFはベータ版の簡易抽出です。改行や文字順が崩れる場合は、TXT・Markdown・Wordをご利用ください。"],
  };
}

function rejectDangerousFile(name: string) {
  const extension = extensionOf(name);
  if (DANGEROUS_EXTENSIONS.has(extension)) return `実行可能ファイルは読み込めません: ${name}`;
  if (extension === ".zip") return "入れ子ZIPは安全のため読み込めません。";
  return "";
}

async function readZipFile(file: File): Promise<ImportedManuscript> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const warnings: string[] = [];
  let expandedSize = 0;

  if (entries.length > BETA_LIMITS.maxZipFiles) {
    throw new Error(`ZIP内のファイル数は${BETA_LIMITS.maxZipFiles}件までです。`);
  }

  for (const entry of entries) {
    const pathError = validateZipPath(entry.name);
    if (pathError) throw new Error(pathError);
    const dangerousError = rejectDangerousFile(entry.name);
    if (dangerousError) throw new Error(dangerousError);
    const entryWithMetadata = entry as typeof entry & {
      _data?: { uncompressedSize?: number };
    };
    expandedSize += entryWithMetadata._data?.uncompressedSize ?? 0;
    if (expandedSize > BETA_LIMITS.maxZipExpandedBytes) {
      throw new Error("ZIP展開後の合計サイズが大きすぎます。");
    }
  }

  const metadataEntry = zip.file("metadata.json");
  let metadata: { title?: string; description?: string } = {};
  if (metadataEntry) {
    try {
      metadata = JSON.parse(await metadataEntry.async("string"));
    } catch {
      warnings.push("metadata.jsonを読み込めませんでした。");
    }
  }

  const textCandidates = entries.filter((entry) =>
    ["book.txt", "book.md", "manuscript.txt", "manuscript.md"].includes(entry.name.toLowerCase()),
  );
  const fallbackTextCandidates = entries.filter((entry) =>
    [".txt", ".md", ".markdown"].includes(extensionOf(entry.name)),
  );
  const textEntry = textCandidates[0] ?? fallbackTextCandidates[0];
  if (!textEntry) throw new Error("ZIP内に book.txt / book.md などの本文ファイルが見つかりません。");
  if (fallbackTextCandidates.length > 1 && !textCandidates.length) {
    warnings.push("本文候補が複数あります。最初に見つかったファイルを読み込みました。");
  }

  return {
    text: (await textEntry.async("string")).replace(/^\uFEFF/, ""),
    title: typeof metadata.title === "string" ? metadata.title : undefined,
    description: typeof metadata.description === "string" ? metadata.description : undefined,
    warnings,
  };
}

export async function importManuscriptFile(file: File): Promise<ImportedManuscript> {
  const validation = validateImportFile(file);
  if (validation) throw new Error(validation);
  const extension = extensionOf(file.name);
  if (extension === ".docx") return readDocxFile(file);
  if (extension === ".pdf") return readPdfFile(file);
  if (extension === ".zip") return readZipFile(file);
  return {
    text: await readTextFile(file),
    warnings: [],
  };
}
