export type Draft = {
  name: string;
  ticker: string;
  pooled: string;
  liquidity: string;
  route: "direct" | "pumpfun";
  chainId: number | string;
};

export const EMPTY_DRAFT: Draft = {
  name: "",
  ticker: "",
  pooled: "",
  liquidity: "",
  route: "direct",
  chainId: 46630,
};

export function parseDraftReply(text: string): Partial<Draft> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const out: Partial<Draft> = {};
    if (typeof raw.name === "string") out.name = raw.name.slice(0, 32);
    if (typeof raw.ticker === "string") out.ticker = raw.ticker.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
    if (typeof raw.pooled === "string") out.pooled = raw.pooled;
    if (typeof raw.liquidity === "string") out.liquidity = raw.liquidity;
    if (raw.route === "pumpfun" || raw.route === "direct") out.route = raw.route;
    return out;
  } catch {
    return {};
  }
}

export function validateDraft(d: Partial<Draft>): string[] {
  const errors: string[] = [];
  if (!d.ticker || d.ticker.length === 0) errors.push("ticker is required");
  if (d.ticker && d.ticker.length > 12) errors.push("ticker is too long");
  const pump = d.route === "pumpfun";
  if (!pump && (d.pooled === undefined || d.pooled === "")) errors.push("pooled is required");
  else if (d.pooled !== undefined && d.pooled !== "" && !(Number(d.pooled) > 0))
    errors.push("pooled must be a positive number");
  if (d.liquidity === undefined || d.liquidity === "") errors.push("liquidity is required");
  else if (!(Number(d.liquidity) > 0)) errors.push("liquidity must be a positive number");
  return errors;
}
