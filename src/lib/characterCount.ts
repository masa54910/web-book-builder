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

type CountableBlock = {
  type: string;
  content?: string;
  left?: { blocks?: CountableBlock[] };
  right?: { blocks?: CountableBlock[] };
};

export function countContentCharacters(blocks: CountableBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === "text") return total + countUserCharacters(block.content || "");
    if (block.type === "columns") {
      return total
        + countContentCharacters(block.left?.blocks || [])
        + countContentCharacters(block.right?.blocks || []);
    }
    return total;
  }, 0);
}
