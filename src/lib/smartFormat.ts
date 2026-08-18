import { classifySmartLine, type SmartLineClassification } from "@/lib/documentStructure";
import { createContentBlockId, ensureUniqueContentBlockIds, type BookContentBlock } from "@/lib/bookProject";
import { normalizeTextMarks, sliceTextMarks, type TextMark } from "@/lib/textStyles";

export type SmartFormatResult = {
  blocks: BookContentBlock[];
  chapters: number;
  subheadings: number;
  paragraphs: number;
};

function normalizeText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function roleMarks(content: string, role: SmartLineClassification, marks?: TextMark[]) {
  const normalized = normalizeTextMarks(content, marks);
  if (role !== "subheading" || !content.length) return normalized;
  return normalizeTextMarks(content, [
    ...normalized,
    { start: 0, end: content.length, bold: true, fontSize: "large" },
  ]);
}

/**
 * Apply the explicit Smart Format pass to text blocks only. Media blocks and
 * their order are preserved exactly; text is normalized structurally and
 * receives lightweight role metadata for downstream TOC/rendering.
 */
export function smartFormatContentBlocks(input: BookContentBlock[]): SmartFormatResult {
  const next: BookContentBlock[] = [];
  let chapters = 0;
  let subheadings = 0;
  let paragraphs = 0;

  for (const block of input) {
    if (block.type !== "text") {
      next.push(block);
      continue;
    }

    const normalized = normalizeText(block.content);
    const parts = normalized.split(/\n{2,}/u);
    let sourceOffset = 0;
    let emittedForBlock = false;
    for (const rawPart of parts) {
      const consumedOffset = normalized.indexOf(rawPart, sourceOffset);
      sourceOffset = Math.max(sourceOffset, consumedOffset + rawPart.length + 2);
      if (!rawPart.trim()) continue;

      const sourceStart = consumedOffset >= 0 ? consumedOffset : 0;
      const appendTextPart = (content: string, role: SmartLineClassification, offset: number) => {
        if (!content.trim()) return;
        if (role === "chapter") chapters += 1;
        else if (role === "subheading") subheadings += 1;
        else paragraphs += 1;
        const marks = sliceTextMarks(block.marks, offset, offset + content.length);
        next.push({
          ...block,
          id: !emittedForBlock && block.id ? block.id : createContentBlockId("paragraph"),
          content,
          marks: roleMarks(content, role, marks),
          structureRole: role === "paragraph" ? undefined : role,
        });
        emittedForBlock = true;
      };

      const lines = rawPart.split("\n");
      const firstLine = lines[0] || rawPart;
      const isolated = lines.length === 1;
      const role = classifySmartLine(firstLine, isolated);

      // A chapter label copied directly above its body is still a standalone
      // heading even when the source used a single line break instead of a
      // blank line. Keep the body text intact as its own paragraph block.
      if (role === "chapter" && lines.length > 1) {
        appendTextPart(firstLine, role, sourceStart);
        appendTextPart(lines.slice(1).join("\n"), "paragraph", sourceStart + firstLine.length + 1);
      } else {
        appendTextPart(rawPart, role, sourceStart);
      }
    }
  }

  const blocks = ensureUniqueContentBlockIds(next.length ? next : [{ id: createContentBlockId("paragraph"), type: "text", content: "" }]);
  return { blocks, chapters, subheadings, paragraphs };
}
