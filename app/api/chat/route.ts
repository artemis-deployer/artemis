import { NextResponse } from "next/server";

export const SYSTEM_PROMPT = [
  "You are Kentir, a coin launch copilot.",
  "Help the user shape a token draft: name, ticker, pool tokens, starting liquidity, route.",
  "Strict output contract: reply with short prose of max 80 words, then exactly ONE fenced ```json block LAST.",
  "That block must be the last thing in the reply and hold exactly these keys: {name, ticker, pooled, liquidity, route}.",
  "Field rules: ticker must be uppercase alphanumeric, max 12 chars; pooled must be a numeric string > 0 and <= 999000000 for direct only; liquidity must be a numeric string > 0; route must be only direct or pumpfun.",
  "Supply is fixed and never editable: 999000000 for direct, 1000000000 for pumpfun.",
  "Never ask for private keys or seed phrases. Never claim to sign transactions.",
  "Example exchange:",
  'User: Arts club coin, ticker ARTS, 500M pooled, 1.5 liquidity, direct route.',
  "Assistant: Great pick for the arts club! I set ARTS with 500000000 pooled and 1.5 liquidity on direct.",
  '```json {"name":"Arts Club","ticker":"ARTS","pooled":"500000","liquidity":"1.5","route":"direct"} ```',
].join(" ");

type ChatMessage = { role: "user" | "assistant"; content: string };

export type ServerDraft = {
  name?: string;
  ticker?: string;
  pooled?: string;
  liquidity?: string;
  route?: "direct" | "pumpfun";
};

const TICKER_RE = /^[A-Z0-9]{1,12}$/;
const DIRECT_SUPPLY = 999000000;

function asNumericString(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed;
}

function isPositiveNumberString(value: string): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function extractServerDraft(reply: string): { draft: ServerDraft | null; draftErrors: string[] } {
  const matches = [...reply.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (matches.length === 0) return { draft: null, draftErrors: ["missing-json-block"] };
  const rawBlock = (matches[matches.length - 1][1] ?? "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBlock) as unknown;
  } catch {
    return { draft: null, draftErrors: ["invalid-json"] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { draft: null, draftErrors: ["invalid-json"] };
  }
  const raw = parsed as Record<string, unknown>;
  const errors: string[] = [];
  const draft: ServerDraft = {};

  if (typeof raw.name === "string" && raw.name.trim() !== "") {
    draft.name = raw.name.trim().slice(0, 32);
  }

  if (typeof raw.ticker !== "string") {
    errors.push("invalid-ticker");
  } else {
    const ticker = raw.ticker.trim().toUpperCase();
    if (!TICKER_RE.test(ticker)) errors.push("invalid-ticker");
    else draft.ticker = ticker;
  }

  if (raw.route !== "direct" && raw.route !== "pumpfun") {
    errors.push("invalid-route");
  } else {
    draft.route = raw.route;
  }

  const liquidity = asNumericString(raw.liquidity);
  if (liquidity === null || !isPositiveNumberString(liquidity)) errors.push("invalid-liquidity");
  else draft.liquidity = liquidity;

  const pooled = asNumericString(raw.pooled);
  if (draft.route === "pumpfun") {
    if (pooled !== null) {
      if (!isPositiveNumberString(pooled)) errors.push("invalid-pooled");
      else draft.pooled = pooled;
    }
  } else {
    if (pooled === null || !isPositiveNumberString(pooled) || Number(pooled) > DIRECT_SUPPLY) {
      errors.push("invalid-pooled");
    } else {
      draft.pooled = pooled;
    }
  }

  if (errors.length > 0) return { draft: null, draftErrors: errors };
  return { draft, draftErrors: [] };
}

export async function POST(req: Request) {
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "mimo-v2.5";
  if (!url || !key) return NextResponse.json({ error: "chat_offline" }, { status: 502 });

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const rawItems: unknown = body.messages;
  const raw = Array.isArray(rawItems) ? rawItems : [];
  const messages = raw.filter(
    (m): m is ChatMessage =>
      typeof m === "object" &&
      m !== null &&
      ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
      typeof (m as ChatMessage).content === "string",
  );
  if (messages.length === 0 || messages.some((m) => m.content.length === 0 || m.content.length > 1000)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const trimmed = messages.slice(-20);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
  } catch {
    return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  } catch {
    return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  }
  const reply = data.choices?.[0]?.message?.content ?? "";
  if (!reply) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  const { draft, draftErrors } = extractServerDraft(reply);
  return NextResponse.json({ reply, draft, draftErrors });
}
