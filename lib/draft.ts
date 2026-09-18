import { DIRECT_SUPPLY } from "./chains";

export type Draft = {
  name: string;
  ticker: string;
  pooled: string;
  liquidity: string;
  route: "direct" | "pumpfun";
  chainId: number | string;
  image?: string;
};

export const EMPTY_DRAFT: Draft = {
  name: "",
  ticker: "",
  pooled: "",
  liquidity: "",
  route: "direct",
  chainId: 46630,
};

function sanitizeDraft(raw: Record<string, unknown>): Partial<Draft> {
  const out: Partial<Draft> = {};
  if (typeof raw.name === "string") out.name = raw.name.slice(0, 32);
  if (typeof raw.ticker === "string") out.ticker = raw.ticker.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
  if (typeof raw.pooled === "string") out.pooled = stripNumericSeparators(raw.pooled);
  if (typeof raw.liquidity === "string") out.liquidity = stripNumericSeparators(raw.liquidity);
  if (raw.route === "pumpfun" || raw.route === "direct") out.route = raw.route;
  return out;
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

export function validateDraft(d: Partial<Draft>): string[] {
  const errors: string[] = [];
  if (!d.ticker || d.ticker.trim().length === 0) errors.push("ticker is required");
  if (d.ticker && d.ticker.length > 12) errors.push("ticker is too long");
  // Dialog runs EVM rail unless route is pumpfun AND chain is solana: require pooled otherwise.
  const pump = d.route === "pumpfun" && (d.chainId === undefined || String(d.chainId).startsWith("solana"));
  if (!pump && (d.pooled === undefined || d.pooled === "")) errors.push("pooled is required");
  else if (d.pooled !== undefined && d.pooled !== "" && !isPositiveNumberString(d.pooled))
    errors.push("pooled must be a positive number");
  else if (!pump && d.pooled !== undefined && d.pooled !== "" && Number(d.pooled) > DIRECT_SUPPLY)
    errors.push("pooled exceeds fixed supply");
  if (d.liquidity === undefined || d.liquidity === "") errors.push("liquidity is required");
  else if (!isPositiveNumberString(d.liquidity)) errors.push("liquidity must be a positive number");
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
