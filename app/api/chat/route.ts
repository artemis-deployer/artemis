import { NextResponse } from "next/server";
import { getChain } from "../../../lib/chains";
import { exceedsDirectSupply } from "../../../lib/draft";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

export const SYSTEM_PROMPT = [
  "You are Artemis, a coin launch copilot.",
  "Help the user shape a token draft: name, ticker, pool tokens, starting liquidity, route.",
  "Strict output contract: reply with a short prose conclusion of max 80 words (summarize the concept first), then exactly ONE fenced ```json block LAST.",
  "That block must be the last thing in the reply and hold only these keys: {name, ticker, pooled, liquidity, route, chainId} (chainId optional, omit to keep current chain).",
  "Numbers are digits with optional decimal point ONLY, max 18 decimals, never units or words: pooled example \"799200000\" (NOT \"1 SOL\"), liquidity example \"0.5\" (NOT \"locked\").",
  "Field rules: ticker must be uppercase alphanumeric, max 12 chars; pooled must be a numeric string > 0 and <= 999000000 for direct (pumpfun pooled optional); liquidity must be a numeric string > 0; route must be only direct or pumpfun (direct for EVM/Robinhood, pumpfun for Solana); chainId must be one of 4663, 46630.",
  "If the user gives no numbers, choose sensible defaults instead of words: pooled 799200000, liquidity 0.5. Never emit placeholders like locked, TBD, or N/A.",
  "Supply is fixed and never editable: 999000000 for direct, 1000000000 for pumpfun.",
  "Revise incrementally from Current draft: replace only what user changed, always return FULL draft JSON.",
  "Chain inference: Robinhood, Hood, or EVM keywords keep or switch EVM chain (4663 mainnet, 46630 testnet); Solana is coming soon — never switch to it, keep the current chain and say so briefly.",
  "Never ask for private keys or seed phrases. Never claim to sign transactions.",
  "Example exchange:",
  'User: Arts club coin, ticker ARTS, 500M pooled, 1.5 liquidity, direct route.',
  "Assistant: Great pick for the arts club! I set ARTS with 500000000 pooled and 1.5 liquidity on direct.",
  '```json {"name":"Arts Club","ticker":"ARTS","pooled":"500000000","liquidity":"1.5","route":"direct","chainId":46630} ```',
].join(" ");

const RETRY_NOTE =
  "Correction: your last reply broke the output contract (non-numeric pooled/liquidity, bad route, or missing keys). Reply again: short prose conclusion first, then ONE valid fenced json block LAST with digits-only numbers (max 18 decimals) and full keys (chainId optional).";

type ChatMessage = { role: "user" | "assistant"; content: string };

export type ServerDraft = {
  name?: string;
  ticker?: string;
  pooled?: string;
  liquidity?: string;
  route?: "direct" | "pumpfun";
  chainId?: number | string;
};

const TICKER_RE = /^[A-Z0-9]{1,12}$/;
const NUMERIC_RE = /^\d+(\.\d+)?$/;

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
  if (!NUMERIC_RE.test(value)) return false;
  // Parity with lib/draft + toTokenUnits: parseEther fails/truncates >18 decimals.
  const frac = value.split(".")[1];
  if (frac !== undefined && frac.length > 18) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function extractServerDraft(reply: string): { draft: ServerDraft | null; draftErrors: string[] } {
  const matches = [...reply.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (matches.length === 0) return { draft: null, draftErrors: ["missing-json-block"] };
  const rawBlock = (matches[matches.length - 1][1] ?? "").trim();
  if (rawBlock.length > 20000) return { draft: null, draftErrors: ["invalid-json"] };
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
    if (pooled === null || !isPositiveNumberString(pooled) || exceedsDirectSupply(pooled)) {
      errors.push("invalid-pooled");
    } else {
      draft.pooled = pooled;
    }
  }

  if (typeof raw.chainId === "number" || typeof raw.chainId === "string") {
    const found = getChain(raw.chainId);
    // Solana rails parked (coming soon): never adopt, keep current chain.
    if (found && !found.disabled) draft.chainId = found.id;
  }

  if (errors.length > 0) return { draft: null, draftErrors: errors };
  return { draft, draftErrors: [] };
}

export async function POST(req: Request) {
  if (!(await checkRateLimit(`chat:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "mimo-v2.5";
  if (!url || !key) return NextResponse.json({ error: "chat_offline" }, { status: 502 });

  let body: unknown;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const rawItems: unknown = (body as { messages?: unknown }).messages;
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
  const rawDraft: unknown = (body as { draft?: unknown }).draft;
  const draftForContext =
    typeof rawDraft === "object" && rawDraft !== null && !Array.isArray(rawDraft)
      ? (rawDraft as Record<string, unknown>)
      : null;
  // Cap draft JSON: attacker-controlled draft object could bloat upstream prompt/cost.
  const systemContent = draftForContext
    ? `${SYSTEM_PROMPT} Current draft: ${JSON.stringify(draftForContext).slice(0, 2000)}.`
    : SYSTEM_PROMPT;

  let upstream: Response;
  try {
    upstream = await callUpstream(url, key, model, [{ role: "system", content: systemContent }, ...trimmed]);
  } catch {
    return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  let reply = await readReply(upstream);
  if (!reply) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  let parsed = extractServerDraft(reply);
  // One self-correction round: models often emit units/words on the first try.
  // Keep first reply/errors when retry also fails (no overwrite on invalid).
  if (!parsed.draft) {
    try {
      const retry = await callUpstream(url, key, model, [
        { role: "system", content: systemContent },
        ...trimmed,
        { role: "system", content: RETRY_NOTE },
      ]);
      if (retry.ok) {
        const second = await readReply(retry);
        if (second) {
          const secondParsed = extractServerDraft(second);
          if (secondParsed.draft) {
            reply = second;
            parsed = secondParsed;
          }
        }
      }
    } catch {
      // Keep first reply and its errors.
    }
  }
  return NextResponse.json({ reply, draft: parsed.draft, draftErrors: parsed.draftErrors });
}

async function callUpstream(
  url: string,
  key: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 500 }),
  });
}

async function readReply(upstream: Response): Promise<string> {
  let data: unknown;
  try {
    data = (await upstream.json()) as unknown;
  } catch {
    return "";
  }
  const content =
    typeof data === "object" && data !== null
      ? (data as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content
      : undefined;
  return typeof content === "string" ? content : "";
}
