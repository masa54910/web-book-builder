export type BookyHelpQueryState = "idle" | "answered" | "ambiguous" | "noMatch";
export type BookyHelpState = BookyHelpQueryState | "guidance" | "success";

export type BookyHelpPresentation = {
  imageSrc: `/characters/booky/${string}.webp`;
  message: string;
};

export const BOOKY_HELP_PRESENTATIONS: Record<BookyHelpState, BookyHelpPresentation> = {
  idle: {
    imageSrc: "/characters/booky/booky-idle.webp",
    message: "質問O.Kにゃん！",
  },
  answered: {
    imageSrc: "/characters/booky/booky-answered.webp",
    message: "ここからできるにゃん！",
  },
  ambiguous: {
    imageSrc: "/characters/booky/booky-ambiguous.webp",
    message: "どっちのことかにゃ？",
  },
  noMatch: {
    imageSrc: "/characters/booky/booky-ambiguous.webp",
    message: "こんな聞き方を試してみてにゃん",
  },
  guidance: {
    imageSrc: "/characters/booky/booky-guidance.webp",
    message: "ここ、ちょっと確認してみるにゃん",
  },
  success: {
    imageSrc: "/characters/booky/booky-success.webp",
    message: "できたにゃん！",
  },
};

export function bookyQueryState(
  hasQuery: boolean,
  resultKind: "answer" | "ambiguous" | "fallback",
): BookyHelpQueryState {
  if (!hasQuery) return "idle";
  if (resultKind === "answer") return "answered";
  if (resultKind === "ambiguous") return "ambiguous";
  return "noMatch";
}

export function resolveBookyHelpState({
  helpOpen,
  queryState,
  actionSuccess,
  hasGuidance,
}: {
  helpOpen: boolean;
  queryState: BookyHelpQueryState;
  actionSuccess: boolean;
  hasGuidance: boolean;
}): BookyHelpState {
  if (helpOpen) return queryState;
  if (actionSuccess) return "success";
  if (hasGuidance) return "guidance";
  return "idle";
}
