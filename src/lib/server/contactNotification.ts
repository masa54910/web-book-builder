const categoryLabels: Record<string, string> = {
  usage: "WebBookMakerの使い方",
  pricing: "料金・プラン",
  payment: "決済について",
  book_purchase: "購入したWebブックについて",
  account: "アカウントについて",
  technical: "不具合・技術的な問題",
  other: "その他",
};

type ContactNotificationInput = {
  name: string;
  replyEmail: string;
  category: string;
  message: string;
  receivedAt?: Date;
};

function configuredEmail(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function notificationText(input: ContactNotificationInput) {
  const receivedAt = (input.receivedAt ?? new Date()).toISOString();
  return [
    "新しいお問い合わせが届きました。",
    "",
    `お名前: ${input.name}`,
    `返信先メールアドレス: ${input.replyEmail}`,
    `お問い合わせ種別: ${categoryLabels[input.category] ?? input.category}`,
    `受付日時: ${receivedAt}`,
    "",
    "お問い合わせ内容:",
    input.message,
  ].join("\n");
}

export async function sendContactNotification(input: ContactNotificationInput) {
  const destination = configuredEmail(process.env.CONTACT_NOTIFICATION_EMAIL);
  const apiKey = configuredEmail(process.env.RESEND_API_KEY);
  const sender = configuredEmail(process.env.RESEND_FROM_EMAIL);

  // The database record remains the source of truth when email is not configured yet.
  if (!destination || !apiKey || !sender) return { sent: false, configured: false };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [destination],
      subject: "WebBookMaker｜新しいお問い合わせ",
      text: notificationText(input),
      reply_to: input.replyEmail,
    }),
  });

  if (!response.ok) {
    throw new Error(`notification provider returned ${response.status}`);
  }

  return { sent: true, configured: true };
}
