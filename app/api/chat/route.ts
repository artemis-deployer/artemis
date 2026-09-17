import { NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "You are Kentir, a coin launch copilot.",
  "Help the user shape a token draft: name, ticker, pool tokens, starting liquidity, route.",
  "Always end your reply with one fenced JSON block holding draft keys:",
  '{"name": string, "ticker": string, "pooled": string, "liquidity": string, "route": "direct" | "pumpfun"}.',
  "Supply is fixed and never editable: 999000000 direct, 1000000000 pumpfun.",
  "Never ask for private keys or recovery phrases. Never claim to sign transactions.",
].join(" ");

type ChatMessage = { role: "user" | "assistant"; content: string };

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

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
      temperature: 0.7,
    }),
  });
  if (!upstream.ok) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content ?? "";
  if (!reply) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  return NextResponse.json({ reply });
}
