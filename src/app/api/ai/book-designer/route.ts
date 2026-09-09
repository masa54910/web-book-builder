import { NextResponse } from "next/server";
import { parseBookDesignSpec } from "@/lib/designSpec";
import { sanitizeDesignPrompt } from "@/lib/aiBookDesigner";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const SYSTEM_PROMPT = `You are WebBookMaker AI Book Designer. Return JSON only, matching the supplied BookDesignSpec shape. Choose only existing enum values. Never include HTML, CSS, arbitrary keys, book content, IDs, URLs, pricing, paywall, or publication changes. Preserve the requested current design when the prompt is vague. The output is presentation-only.`;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeUpstreamField(value: unknown, maxLength = 240) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, maxLength);
}

function safeContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  return {
    title: typeof candidate.title === "string" ? candidate.title.slice(0, 160) : "",
    description: typeof candidate.description === "string" ? candidate.description.slice(0, 500) : "",
    chapterTitles: Array.isArray(candidate.chapterTitles) ? candidate.chapterTitles.filter((item): item is string => typeof item === "string").slice(0, 30).map((item) => item.slice(0, 120)) : [],
    textSample: typeof candidate.textSample === "string" ? candidate.textSample.slice(0, 1800) : "",
    imageCount: typeof candidate.imageCount === "number" ? Math.max(0, Math.min(1000, candidate.imageCount)) : 0,
    contentBlockCount: typeof candidate.contentBlockCount === "number" ? Math.max(0, Math.min(1000, candidate.contentBlockCount)) : 0,
    currentDesign: candidate.currentDesign,
  };
}

export async function POST(request: Request) {
  try {
    if (process.env.AI_BOOK_DESIGNER_ENABLED !== "true") return jsonError("AIデザイン機能は現在利用できません。", 503);
    const user = await requireAuthenticatedUser(request);
    if (!user) return jsonError("認証が必要です。", 401);
    const body = await request.json() as { prompt?: unknown; context?: unknown };
    const prompt = sanitizeDesignPrompt(body.prompt);
    if (!prompt) return jsonError("デザインの希望を入力してください。", 400);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return jsonError("AIデザイン機能は現在利用できません。", 503);
    const dailyLimit = Number.parseInt(process.env.AI_BOOK_DESIGNER_DAILY_LIMIT || "10", 10);
    const quotaLimit = Number.isFinite(dailyLimit) ? Math.min(100, Math.max(1, dailyLimit)) : 10;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_BOOK_DESIGNER_MODEL?.trim() || "gpt-5.4",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ prompt, context: safeContext(body.context) }) },
        ],
      }),
    });
    if (!response.ok) {
      const upstreamPayload = await response.json().catch(() => null);
      const upstreamError =
        upstreamPayload && typeof upstreamPayload === "object" && "error" in upstreamPayload
          ? upstreamPayload.error
          : null;
      const upstreamErrorRecord = upstreamError && typeof upstreamError === "object"
        ? upstreamError as Record<string, unknown>
        : {};
      const safeType = safeUpstreamField(upstreamErrorRecord.type, 80) ?? "unknown";
      const safeCode = safeUpstreamField(upstreamErrorRecord.code, 120) ?? "unknown";
      const safeParam = safeUpstreamField(upstreamErrorRecord.param, 120) ?? "none";
      const safeMessage = safeUpstreamField(upstreamErrorRecord.message) ?? "unknown";
      console.error(
        `[ai-book-designer] OpenAI request failed status=${response.status} type=${safeType} code=${safeCode} param=${safeParam} message=${safeMessage}`,
      );
      return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    }
    let payload: { choices?: Array<{ message?: { content?: string } }> };
    try {
      payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    } catch {
      console.error(`[ai-book-designer] OpenAI response failed status=${response.status} stage=response-json-parse`);
      return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    }
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) {
      console.error(`[ai-book-designer] OpenAI response failed status=${response.status} stage=missing-content`);
      return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(`[ai-book-designer] OpenAI response failed status=${response.status} stage=design-spec-json-parse`);
      return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    }
    const spec = parseBookDesignSpec(parsed);
    if (!spec.success) {
      console.error(`[ai-book-designer] OpenAI response failed status=${response.status} stage=design-spec-validation`);
      return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    }

    // Count only a generation that reached a valid, renderer-safe DesignSpec.
    // The RPC performs an atomic increment/rollback so concurrent successes
    // cannot move the daily count past the configured limit.
    const { data: allowed, error: quotaError } = await requireSupabaseAdminClient().rpc("consume_ai_book_designer_quota", {
      p_user_id: user.id,
      p_limit: quotaLimit,
    });
    if (quotaError) {
      console.error("ai.book-designer quota failed", quotaError.message);
      return jsonError("AIデザイン機能は現在利用できません。", 503);
    }
    if (allowed !== true) return jsonError("本日のAIデザイン生成回数の上限に達しました。", 429);
    return NextResponse.json({ spec: spec.data, model: process.env.OPENAI_BOOK_DESIGNER_MODEL?.trim() || "gpt-5.4" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ai.book-designer failed", error instanceof Error ? error.message : "unknown");
    return jsonError("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 503);
  }
}
