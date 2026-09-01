const HELP_PUNCTUATION = /[。、，,.!?！？「」『』【】\[\]（）()：:；;・…‥“”"'`]/gu;

export function normalizeHelpQuery(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(HELP_PUNCTUATION, " ")
    .replace(/[\s\u3000]+/gu, " ")
    .trim();
}
