export type CharacterEventType = "welcome" | "save" | "publish" | "loading" | "analytics" | "error";

export type CharacterMessage = {
  id: string;
  type: CharacterEventType;
  speaker: "mio" | "booky";
  message: string;
  mood: "smile" | "cheer" | "think" | "surprise" | "calm";
};

const messages: Record<CharacterEventType, CharacterMessage[]> = {
  welcome: [
    { id: "welcome-mio-1", type: "welcome", speaker: "mio", mood: "smile", message: "文章を貼るだけで、作品の形が見えてきますよ。" },
    { id: "welcome-booky-1", type: "welcome", speaker: "booky", mood: "calm", message: "ブッキーはしおりの準備をしています。" },
  ],
  save: [
    { id: "save-mio-1", type: "save", speaker: "mio", mood: "cheer", message: "保存できました。公開前のバックアップも忘れずに。" },
    { id: "save-booky-1", type: "save", speaker: "booky", mood: "smile", message: "にゃ。原稿、ちゃんとしまっておきました。" },
  ],
  publish: [
    { id: "publish-mio-1", type: "publish", speaker: "mio", mood: "cheer", message: "公開できました。ここからは作品を届ける時間です。" },
    { id: "publish-booky-1", type: "publish", speaker: "booky", mood: "surprise", message: "しおりチャームがきらっとしました。" },
  ],
  loading: [
    { id: "loading-mio-1", type: "loading", speaker: "mio", mood: "think", message: "ページを整えています。少しだけお待ちください。" },
  ],
  analytics: [
    { id: "analytics-mio-1", type: "analytics", speaker: "mio", mood: "calm", message: "読まれ方を見ると、次に届ける言葉が見えてきます。" },
  ],
  error: [
    { id: "error-mio-1", type: "error", speaker: "mio", mood: "surprise", message: "うまくいきませんでした。作品データは消さずに確認します。" },
    { id: "error-booky-1", type: "error", speaker: "booky", mood: "think", message: "ブッキーも原因を探しています。" },
  ],
};

let lastMessageId = "";

export function pickCharacterMessage(type: CharacterEventType): CharacterMessage {
  const pool = messages[type];
  const candidates = pool.filter((message) => message.id !== lastMessageId);
  const selected = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
  lastMessageId = selected.id;
  return selected;
}
