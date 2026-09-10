import type { BookContentBlock } from "@/lib/bookProject";
import type { BookDesignSystem } from "@/lib/designSystemLibrary";

export type PagePatternId = "cover" | "chapter-opening" | "standard-text" | "hero-image" | "image-text" | "editorial-columns" | "comparison" | "quote" | "checklist" | "step-guide" | "closing";
export type PagePatternAssignment = { blockId: string; pattern: PagePatternId; reason: string };

export const PAGE_PATTERN_LIBRARY: readonly PagePatternId[] = ["cover", "chapter-opening", "standard-text", "hero-image", "image-text", "editorial-columns", "comparison", "quote", "checklist", "step-guide", "closing"];

function textOf(block: BookContentBlock) { return block.type === "text" ? block.content : ""; }
export function assignPagePatterns(blocks: readonly BookContentBlock[], system?: BookDesignSystem): PagePatternAssignment[] {
  return blocks.map((block, index) => {
    const text = textOf(block);
    const lower = text.toLowerCase();
    let pattern: PagePatternId = "standard-text";
    let reason = "通常本文";
    if (index === 0) { pattern = "cover"; reason = "先頭ブロック"; }
    else if (block.type === "columns") { pattern = system?.allowedPagePatterns.includes("columns") ? "editorial-columns" : "standard-text"; reason = "Columns構造を保持"; }
    else if (block.type === "image") { pattern = "hero-image"; reason = "画像ブロック"; }
    else if (/^#{1,2}\s|^第.+章|chapter/i.test(text.trim())) { pattern = "chapter-opening"; reason = "章見出し"; }
    else if (/比較|versus|vs\.?|違い/.test(lower)) { pattern = "comparison"; reason = "比較語を含む本文"; }
    else if (/引用|「.+」|\".+\"/.test(text)) { pattern = "quote"; reason = "引用表現"; }
    else if (/チェック|確認項目|☑|✅/.test(text)) { pattern = "checklist"; reason = "チェック項目"; }
    else if (/手順|step|第[一二三]歩/i.test(text)) { pattern = "step-guide"; reason = "手順表現"; }
    else if (/まとめ|おわりに|結び|closing/i.test(text)) { pattern = "closing"; reason = "締めくくり"; }
    return { blockId: block.id, pattern, reason };
  });
}
