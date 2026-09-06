import "server-only";

const sender = () => process.env.RESEND_FROM_EMAIL?.trim() || "";

function clean(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export type ContactReplyInput = {
  recipient: string;
  subject: string;
  body: string;
  inquiryName: string;
  category: string;
};

export async function sendContactReply(input: ContactReplyInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const from = sender();
  if (!apiKey || !from) throw new Error("reply provider is not configured");

  const body = [
    "WebBookMakerからの返信です。",
    "",
    `${clean(input.inquiryName)} 様`,
    "",
    clean(input.body),
    "",
    "WebBookMaker サポート",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      reply_to: "contact@webbookmaker.jp",
      subject: clean(input.subject),
      text: body,
    }),
  });

  if (!response.ok) throw new Error(`reply provider returned ${response.status}`);
  const payload = (await response.json().catch(() => null)) as { id?: unknown } | null;
  return { providerMessageId: typeof payload?.id === "string" ? payload.id : null };
}

