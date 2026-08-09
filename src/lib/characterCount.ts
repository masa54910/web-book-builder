/**
 * Count user-visible characters without treating UTF-16 surrogate pairs as
 * two characters.  Japanese text is counted intuitively while emoji and
 * combining marks remain a single grapheme where the browser supports the
 * native segmenter.
 */
export function countUserCharacters(value: string) {
  if (!value) return 0;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const Segmenter = Intl.Segmenter;
    const segmenter = new Segmenter("ja", { granularity: "grapheme" });
    return [...segmenter.segment(value)].length;
  }
  return Array.from(value).length;
}

export function countContentCharacters(blocks: Array<{ type: string; content?: string }>) {
  return blocks.reduce((total, block) => {
    return total + (block.type === "text" ? countUserCharacters(block.content || "") : 0);
  }, 0);
}
