export const TEXT_COLORS = [
  "#111827",
  "#1677B8",
  "#EF4444",
  "#EAB308",
  "#667085",
] as const;

export type TextColor = (typeof TEXT_COLORS)[number];
export type TextFontSize = "small" | "normal" | "large";

export const TEXT_COLOR_LABELS: Record<TextColor, string> = {
  "#111827": "黒",
  "#1677B8": "青",
  "#EF4444": "赤",
  "#EAB308": "黄色",
  "#667085": "グレー",
};

export type TextMark = {
  start: number;
  end: number;
  bold?: boolean;
  color?: TextColor;
  fontSize?: TextFontSize;
};

function validMark(mark: unknown, textLength: number): TextMark | null {
  if (!mark || typeof mark !== "object") return null;
  const candidate = mark as Partial<TextMark>;
  const start = Number(candidate.start);
  const end = Number(candidate.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const boundedStart = Math.max(0, Math.min(textLength, Math.floor(start)));
  const boundedEnd = Math.max(boundedStart, Math.min(textLength, Math.floor(end)));
  if (boundedEnd <= boundedStart) return null;
  const next: TextMark = { start: boundedStart, end: boundedEnd };
  if (candidate.bold === true) next.bold = true;
  if (typeof candidate.color === "string" && (TEXT_COLORS as readonly string[]).includes(candidate.color)) {
    next.color = candidate.color as TextColor;
  }
  if (candidate.fontSize === "small" || candidate.fontSize === "normal" || candidate.fontSize === "large") {
    if (candidate.fontSize !== "normal") next.fontSize = candidate.fontSize;
  }
  return next.bold || next.color || next.fontSize ? next : null;
}

export function normalizeTextMarks(text: string, marks: unknown): TextMark[] {
  if (!Array.isArray(marks)) return [];
  const normalized = marks.map((mark) => validMark(mark, text.length)).filter((mark): mark is TextMark => Boolean(mark));
  return normalized.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function marksCoverRange(marks: TextMark[] | undefined, start: number, end: number, key: "bold" | "fontSize" | "color") {
  const normalized = normalizeTextMarks("".padEnd(Math.max(end, 0)), marks);
  return end > start && normalized.some((mark) => mark.start <= start && mark.end >= end && Boolean(mark[key]));
}

export function sliceTextMarks(marks: TextMark[] | undefined, start: number, end: number): TextMark[] {
  if (!marks?.length || end <= start) return [];
  return normalizeTextMarks("".padEnd(Math.max(0, end - start)), marks
    .map((mark) => ({
      ...mark,
      start: Math.max(mark.start, start) - start,
      end: Math.min(mark.end, end) - start,
    })));
}

function sameStyle(a: TextMark, b: TextMark) {
  return a.bold === b.bold && a.color === b.color && a.fontSize === b.fontSize;
}

export function applyTextMark(
  text: string,
  marks: TextMark[] | undefined,
  start: number,
  end: number,
  patch: Partial<Pick<TextMark, "bold" | "color" | "fontSize">>,
): TextMark[] {
  const from = Math.max(0, Math.min(text.length, Math.floor(start)));
  const to = Math.max(from, Math.min(text.length, Math.floor(end)));
  if (to <= from) return normalizeTextMarks(text, marks);
  const boundaries = new Set([from, to]);
  for (const mark of normalizeTextMarks(text, marks)) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const result: TextMark[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const segmentStart = sorted[i];
    const segmentEnd = sorted[i + 1];
    if (segmentEnd <= segmentStart) continue;
    const existing = normalizeTextMarks(text, marks).filter((mark) => mark.start <= segmentStart && mark.end >= segmentEnd);
    const existingStyle = existing[existing.length - 1];
    const base: TextMark = { start: segmentStart, end: segmentEnd };
    if (existingStyle) {
      if (existingStyle.bold) base.bold = true;
      if (existingStyle.color) base.color = existingStyle.color;
      if (existingStyle.fontSize) base.fontSize = existingStyle.fontSize;
    }
    if (segmentStart >= from && segmentEnd <= to) Object.assign(base, patch);
    if (base.bold || base.color || base.fontSize) result.push(base);
  }
  return result
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce<TextMark[]>((merged, mark) => {
      const previous = merged[merged.length - 1];
      if (previous && previous.end === mark.start && sameStyle(previous, mark)) previous.end = mark.end;
      else merged.push({ ...mark });
      return merged;
    }, []);
}

export function textStyleAt(marks: TextMark[] | undefined, offset: number) {
  return normalizeTextMarks("".padEnd(offset + 1), marks).filter((mark) => mark.start <= offset && mark.end > offset).pop();
}

export const TEXT_FONT_SIZE_LABELS: Record<TextFontSize, string> = {
  small: "小",
  normal: "標準",
  large: "大",
};

export const TEXT_FONT_SIZE_CSS: Record<TextFontSize, string> = {
  small: "0.9em",
  normal: "1em",
  large: "1.2em",
};
