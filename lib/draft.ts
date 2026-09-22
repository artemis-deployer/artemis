import { DIRECT_SUPPLY, getChain } from "./chains";

export type Draft = {
  name: string;
  ticker: string;
  pooled: string;
  liquidity: string;
  route: "direct" | "pumpfun";
  chainId: number | string;
  image?: string;
  tagline?: string;
  description?: string;
  lore?: string;
  logoPrompt?: string;
  vibeScore?: number;
  marketingHook?: string;
  brandColors?: string[];
  xUrl?: string;
  webUrl?: string;
};

export const EMPTY_DRAFT: Draft = {
  name: "",
  ticker: "",
  pooled: "",
  liquidity: "",
  route: "direct",
  chainId: 46630,
};

// ponytail: client lenient (strip ticker/commas) only for missing-json fallback;
// server strict rejects to force retry, StudioChat blocks fallback on value errors.
function sanitizeDraft(raw: Record<string, unknown>): Partial<Draft> {
  const out: Partial<Draft> = {};
  if (typeof raw.name === "string") {
    const trimmed = raw.name.trim();
    if (trimmed !== "") out.name = trimmed.slice(0, 32);
  }
  if (typeof raw.ticker === "string") out.ticker = raw.ticker.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
  if (typeof raw.pooled === "string") out.pooled = stripNumericSeparators(raw.pooled);
  if (typeof raw.liquidity === "string") out.liquidity = stripNumericSeparators(raw.liquidity);
  if (raw.route === "pumpfun" || raw.route === "direct") out.route = raw.route;
  if (typeof raw.chainId === "number" || typeof raw.chainId === "string") {
    const found = getChain(raw.chainId);
    // Solana rails parked (coming soon): never adopt, keep current chain.
    if (found && !found.disabled) out.chainId = found.id;
  }
  if (typeof raw.tagline === "string" && raw.tagline.trim() !== "") {
    out.tagline = raw.tagline.trim().slice(0, 80);
  }
  if (typeof raw.description === "string" && raw.description.trim() !== "") {
    out.description = raw.description.trim().slice(0, 500);
  }
  if (typeof raw.lore === "string" && raw.lore.trim() !== "") {
    out.lore = raw.lore.trim().slice(0, 2000);
  }
  if (typeof raw.logoPrompt === "string" && raw.logoPrompt.trim() !== "") {
    out.logoPrompt = raw.logoPrompt.trim().slice(0, 300);
  }
  if (typeof raw.marketingHook === "string" && raw.marketingHook.trim() !== "") {
    out.marketingHook = raw.marketingHook.trim().slice(0, 120);
  }
  if (typeof raw.xUrl === "string" && raw.xUrl.trim() !== "") {
    const x = normalizeXUrl(raw.xUrl);
    if (x) out.xUrl = x;
  }
  if (typeof raw.webUrl === "string" && raw.webUrl.trim() !== "") {
    const w = normalizeWebUrl(raw.webUrl);
    if (w) out.webUrl = w;
  }
  if (Array.isArray(raw.brandColors)) {
    const colors = raw.brandColors
      .filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim()))
      .map((c) => c.trim())
      .slice(0, 2);
    if (colors.length > 0) out.brandColors = colors;
  }
  if (typeof raw.vibeScore === "number" || typeof raw.vibeScore === "string") {
    const v = clampVibeScore(raw.vibeScore);
    if (v !== null) out.vibeScore = v;
  }
  return out;
}

/** Clamp any value to an integer vibe score 1-10, null when unusable. */
export function clampVibeScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const scaled = n > 10 ? Math.round(n / 10) : Math.round(n);
  return Math.min(10, Math.max(1, scaled));
}

/**
 * Accept @handle, bare handle, or x.com/twitter.com URL → canonical https URL.
 * Null when unusable (caller shows the hint, nothing stored).
 */
export function normalizeXUrl(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  const fromUrl = t.match(/^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:\/.*)?$/);
  if (fromUrl) return `https://x.com/${fromUrl[1]}`;
  const handle = t.match(/^@?([A-Za-z0-9_]{1,15})$/);
  if (handle) return `https://x.com/${handle[1]}`;
  return null;
}

/** Accept bare domain or full URL → https URL. Null when unusable. */
export function normalizeWebUrl(value: string): string | null {
  const t = value.trim();
  if (!t || /\s/.test(t) || t.length > 256) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  if (!/^https:\/\/[^/$.?#].[^/]*\.[a-z]{2,}([/?#].*)?$/i.test(withProto)) return null;
  return withProto.slice(0, 256);
}

/** Free AI image URL (Pollinations, no key) for a logo prompt + seed. */
export function logoImageUrl(logoPrompt: string, seed: number): string {
  // Pin model=turbo: the default model 429s on community rate limits (verified 2026-09-22).
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(logoPrompt)}?width=512&height=512&seed=${Math.floor(seed)}&nologo=true&model=turbo`;
}

/** Instant mascot fallback when AI image generation fails (DiceBear, no key). */
export function logoFallbackUrl(ticker: string, seed: number): string {
  const clean = ticker.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "ARTEMIS";
  return `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(`${clean}-${Math.floor(seed)}`)}&backgroundColor=1a1b1f&size=512`;
}

const STOPWORDS = new Set(
  "a,an,the,that,this,these,those,it,its,i,my,we,our,you,your,me,us,on,in,at,for,to,of,with,and,or,but,is,are,was,were,be,has,have,had,not,no,just,one,more,about,into,which,who,when,while,from,coin,token,meme,community,called,named".split(
    ",",
  ),
);

/**
 * Local concept generator when the LLM is unreachable: keyword templates in
 * Artemis voice with safe numeric defaults. Never throws, always fills a draft.
 */
export function smartConcept(idea: string): Partial<Draft> {
  const words = idea.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const keyword = (words.find((w) => !STOPWORDS.has(w.toLowerCase())) || words[0] || "moon").toUpperCase();
  const symbol = keyword.replace(/[^A-Z0-9]/g, "").slice(0, 8) || "MOON";
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") || "Moon";
  const name = `${title} Coin`.slice(0, 32);
  return {
    name,
    ticker: symbol,
    pooled: "799200000",
    liquidity: "0.5",
    route: "direct",
    tagline: `${symbol}: minted from one line of conviction.`,
    description: `${name} turns "${idea.trim().slice(0, 120)}" into a community coin. Fixed supply, no mint, fair launch from your own wallet.`,
    lore: `Born from a single idea: "${idea.trim().slice(0, 120)}". Holders write the rest of the story.`,
    logoPrompt: `Cute crypto sticker mascot for ${name} ${symbol}, bold vector badge, dark background, no text`,
    vibeScore: 8,
  };
}

export function shouldAutoApply(patch: Partial<Draft>): boolean {
  return Object.keys(patch).length > 0;
}

/** Mainnet consent must not carry across chains (pickers, AI, undo). */
export function shouldResetConsentOnChainChange(prevChainId: number | string, nextChainId: number | string): boolean {
  return String(prevChainId) !== String(nextChainId);
}

export function applyAutoPatch(prev: Draft, patch: Partial<Draft>): { next: Draft; prevSnapshot: Draft } {
  return { next: { ...prev, ...patch }, prevSnapshot: { ...prev } };
}

/** Form input id → draft key. Chat input edits no draft key. */
const FOCUSED_FIELD: Record<string, keyof Draft> = {
  "token-name": "name",
  "token-ticker": "ticker",
  "pool-tokens": "pooled",
  "initial-liquidity": "liquidity",
  "artwork-url": "image",
  "x-url": "xUrl",
  "web-url": "webUrl",
};

/**
 * Merge AI patch over latest draft, dropping key user currently edits.
 * Returns null when nothing left to apply (no keystroke overwrite).
 */
export function resolveAutoPatch(
  latest: Draft,
  patch: Partial<Draft>,
  activeId: string | null,
): { next: Draft; prevSnapshot: Draft } | null {
  const filtered = { ...patch };
  if (activeId) {
    const key = FOCUSED_FIELD[activeId];
    if (key) delete filtered[key];
  }
  if (Object.keys(filtered).length === 0) return null;
  return { next: { ...latest, ...filtered }, prevSnapshot: { ...latest } };
}

function tryParse(slice: string): Partial<Draft> | null {
  try {
    const raw = JSON.parse(slice) as Record<string, unknown>;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const out = sanitizeDraft(raw);
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function parseDraftReply(text: string): Partial<Draft> {
  // Fast path: single JSON object spanning first "{" to last "}".
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const direct = tryParse(text.slice(start, end + 1));
    if (direct) return direct;
  }
  // Fallback: replies with several fenced blocks/tables. Scan flat {...}
  // candidates mentioning a ticker, newest first.
  const inners = text.match(/\{[^{}]*\}/g) ?? [];
  for (let i = inners.length - 1; i >= 0; i--) {
    if (!inners[i].includes("ticker")) continue;
    const parsed = tryParse(inners[i]);
    if (parsed) return parsed;
  }
  return {};
}

/** Precise > DIRECT_SUPPLY without Number rounding (e.g. 999000000.0000000001). */
export function exceedsDirectSupply(value: string): boolean {
  const [intPart, fracPart = ""] = value.split(".");
  const intNorm = intPart.replace(/^0+/, "") || "0";
  const supplyStr = String(DIRECT_SUPPLY);
  if (intNorm.length !== supplyStr.length) return intNorm.length > supplyStr.length;
  if (intNorm !== supplyStr) return intNorm > supplyStr;
  return /[1-9]/.test(fracPart);
}

export function validateDraft(d: Partial<Draft>): string[] {
  const errors: string[] = [];
  if (!d.ticker || d.ticker.trim().length === 0) errors.push("Ticker Symbol is required");
  if (d.ticker && d.ticker.length > 12) errors.push("Ticker Symbol is too long (max 12)");
  // Dialog runs EVM rail unless route is pumpfun AND chain is solana: require pooled otherwise.
  // Labels mirror LaunchForm: "Tokens for Liquidity Pool" (pooled) and "Starting Deposit" (liquidity).
  const pump = d.route === "pumpfun" && (d.chainId === undefined || String(d.chainId).startsWith("solana"));
  if (!pump && (d.pooled === undefined || d.pooled === "")) errors.push("Tokens for Liquidity Pool is required");
  else if (d.pooled !== undefined && d.pooled !== "" && !isPositiveNumberString(d.pooled))
    errors.push("Tokens for Liquidity Pool must be a positive number");
  else if (!pump && d.pooled !== undefined && d.pooled !== "" && exceedsDirectSupply(d.pooled))
    errors.push("Tokens for Liquidity Pool exceeds fixed supply");
  if (d.liquidity === undefined || d.liquidity === "") errors.push("Starting Deposit is required");
  else if (!isPositiveNumberString(d.liquidity)) errors.push("Starting Deposit must be a positive number");
  return errors;
}

const NUMERIC_RE = /^\d+(\.\d+)?$/;

// ponytail: same strict shape as toTokenUnits + server route, one shared check
function isPositiveNumberString(value: string): boolean {
  if (!NUMERIC_RE.test(value)) return false;
  // parseEther truncates >18 decimals (dust becomes 0): reject before onchain.
  const frac = value.split(".")[1];
  if (frac !== undefined && frac.length > 18) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Shared thousand-separator strip for numeric inputs (commas + whitespace). */
export function stripNumericSeparators(value: string): string {
  return value.replace(/[,\s]/g, "");
}

/**
 * MorphX-style structured reply: opening teaser, quoted tagline, then labeled
 * identity fields. Rendered as markdown in the chat bubble.
 */
export function formatConceptReply(prose: string, concept: Partial<Draft>): string {
  const parts = [prose.trim()].filter(Boolean);
  const text = (v: string | undefined) => (typeof v === "string" ? v.trim() : "");
  const tagline = text(concept.tagline);
  if (tagline) parts.push(`> ${tagline}`);
  const name = text(concept.name);
  const ticker = text(concept.ticker).replace(/^\$/, "");
  if (name || ticker) parts.push(`**Name:** ${name || "-"} · **Ticker:** ${ticker ? `$${ticker}` : "-"}`);
  const section = (label: string, value: string) => {
    if (value) parts.push(`**${label}**\n${value}`);
  };
  section("Description", text(concept.description));
  section("Lore", text(concept.lore));
  section("Hook", text(concept.marketingHook));
  if (Array.isArray(concept.brandColors) && concept.brandColors.length > 0) {
    parts.push(`**Colors:** ${concept.brandColors.map((c) => `\`${c}\``).join(" ")}`);
  }
  return parts.join("\n\n");
}

/** Human-readable reply: hide the machine-readable JSON draft block. */
export function displayReplyText(reply: string, patched: boolean): string {
  const stripped = stripDraftBlocks(reply)
    .replace(/\{[^{}]*"ticker"[^{}]*\}\s*$/, "")
    .trim();
  if (stripped) return stripped;
  return patched ? "Draft updated from your idea — review it in Manual Parameters." : reply;
}

function stripDraftBlocks(reply: string): string {
  const stripped = reply.replace(/```json\s*[\s\S]*?```/g, "");
  // Some models emit bare (unfenced) JSON: drop the last parseable block holding a ticker.
  const blocks = [...stripped.matchAll(/\n\{[\s\S]*?\n\}/g)].map((m) => m[0]);
  for (let i = blocks.length - 1; i >= 0; i--) {
    try {
      // Detection only: tolerate trailing commas models love to add.
      const parsed = JSON.parse(blocks[i].replace(/,\s*([}\]])/g, "$1")) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && typeof parsed.ticker === "string") {
        return stripped.replace(blocks[i], "");
      }
    } catch {
      // Not JSON prose — keep it.
    }
  }
  return stripped;
}
