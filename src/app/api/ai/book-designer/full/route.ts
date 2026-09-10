import { NextResponse } from "next/server";
import { matchDesignSystems } from "@/lib/designSystemLibrary";
import { parseBookDesignSpec } from "@/lib/designSpec";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

const MODEL = process.env.OPENAI_BOOK_DESIGNER_MODEL?.trim() || "gpt-5.4";
const SAFE_KEYS = new Set(["theme", "genre", "mood", "typography", "palette", "page", "cover", "image", "motion"]);

function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
function safeBrief(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return { category: input.category, audience: input.audience, tone: input.tone, contentBalance: input.contentBalance, density: input.density, cover: input.cover, brightness: input.brightness, decoration: input.decoration, emphasis: input.emphasis, avoid: input.avoid };
}

export async function POST(request: Request) {
  try {
    if (process.env.AI_BOOK_DESIGNER_ENABLED !== "true") return error("AIデザイン機能は現在利用できません。", 503);
    if (!await requireAuthenticatedUser(request)) return error("認証が必要です。", 401);
    const body = await request.json() as { brief?: unknown; bookProfile?: unknown };
    const brief = safeBrief(body.brief);
    if (!brief) return error("デザイン方針が必要です。", 400);
    const candidates = matchDesignSystems(brief as never, 5);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return error("AIデザイン機能は現在利用できません。", 503);
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: MODEL, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Choose exactly one candidate system and return JSON {selectedDesignSystemId:string, overrides:object}. Overrides must be minimal and use only existing design tokens. Never return HTML, CSS, content, IDs, pricing, or publication data." }, { role: "user", content: JSON.stringify({ brief, candidates: candidates.map(({ system, score }) => ({ id: system.id, name: system.name, description: system.description, score })), bookProfile: body.bookProfile }) }] }) });
    if (!response.ok) return error("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const selected = candidates.find(({ system }) => system.id === parsed.selectedDesignSystemId)?.system;
    if (!selected || !parsed.overrides || typeof parsed.overrides !== "object") return error("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    const overrides = Object.fromEntries(Object.entries(parsed.overrides).filter(([key]) => SAFE_KEYS.has(key)));
    const merged = { ...selected.spec, ...overrides, typography: { ...selected.spec.typography, ...(overrides.typography || {}) }, palette: { ...selected.spec.palette, ...(overrides.palette || {}) }, page: { ...selected.spec.page, ...(overrides.page || {}) }, cover: { ...selected.spec.cover, ...(overrides.cover || {}) }, image: { ...selected.spec.image, ...(overrides.image || {}) }, motion: { ...selected.spec.motion, ...(overrides.motion || {}) } };
    const validated = parseBookDesignSpec(merged);
    if (!validated.success) return error("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
    return NextResponse.json({ selectedDesignSystemId: selected.id, selectedDesignSystemName: selected.name, spec: validated.data, overrides }, { headers: { "Cache-Control": "no-store" } });
  } catch { return error("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502); }
}
