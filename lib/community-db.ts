import postgres from "postgres";

export type TokenRow = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
  image: string;
  tagline: string;
  description: string;
  lore: string;
  marketing_hook: string;
  x_url: string;
  web_url: string;
  created_at: string;
};

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let cached: ReturnType<typeof postgres> | null = null;

function sql() {
  cached ??= postgres(process.env.DATABASE_URL as string, { prepare: false });
  return cached;
}

export async function listTokens(limit = 50): Promise<TokenRow[]> {
  const n = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 50;
  const rows = await sql()`SELECT * FROM tokens ORDER BY created_at DESC LIMIT ${n}`;
  return rows as unknown as TokenRow[];
}

export async function saveToken(input: {
  chainId: string;
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  pool?: string;
  txHash?: string;
  image?: string;
  tagline?: string;
  description?: string;
  lore?: string;
  marketingHook?: string;
  xUrl?: string;
  webUrl?: string;
}): Promise<void> {
  const t = normalizeTokenInput(input);
  await sql()`INSERT INTO tokens (chain_id, address, creator, name, symbol, pool, tx_hash, image, tagline, description, lore, marketing_hook, x_url, web_url)
    VALUES (${t.chainId}, ${t.address}, ${t.creator}, ${t.name}, ${t.symbol}, ${t.pool}, ${t.txHash}, ${t.image}, ${t.tagline}, ${t.description}, ${t.lore}, ${t.marketingHook}, ${t.xUrl}, ${t.webUrl})
    ON CONFLICT (chain_id, address) DO UPDATE SET
      creator = EXCLUDED.creator, name = EXCLUDED.name, symbol = EXCLUDED.symbol,
      pool = EXCLUDED.pool, tx_hash = EXCLUDED.tx_hash, image = EXCLUDED.image,
      tagline = EXCLUDED.tagline, description = EXCLUDED.description, lore = EXCLUDED.lore,
      marketing_hook = EXCLUDED.marketing_hook, x_url = EXCLUDED.x_url, web_url = EXCLUDED.web_url`;
}

// ponytail: route slices raw then verifies; trim-then-slice here keeps stored rows clean
export function normalizeTokenInput(input: {
  chainId: string;
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  pool?: string;
  txHash?: string;
  image?: string;
  tagline?: string;
  description?: string;
  lore?: string;
  marketingHook?: string;
  xUrl?: string;
  webUrl?: string;
}): {
  chainId: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  txHash: string;
  image: string;
  tagline: string;
  description: string;
  lore: string;
  marketingHook: string;
  xUrl: string;
  webUrl: string;
} {
  // ponytail: Array.from slices by code point, never splits surrogate pairs (lone surrogates break Postgres UTF-8)
  const clean = (v: unknown) => (typeof v === "string" ? Array.from(v.trim()).slice(0, 200).join("") : "");
  const cleanLong = (v: unknown, max: number) =>
    typeof v === "string" ? Array.from(v.trim()).slice(0, max).join("") : "";
  const rawImage = typeof input.image === "string" ? input.image.trim() : "";
  // Links: https-only, attacker quota-safe; anything else stores empty.
  const cleanLink = (v: unknown) => {
    if (typeof v !== "string") return "";
    const t = v.trim().slice(0, 256);
    return t.startsWith("https://") && !/\s/.test(t) ? t : "";
  };
  return {
    chainId: String(input.chainId ?? "").trim(),
    address: String(input.address ?? "").trim(),
    creator: clean(input.creator),
    name: clean(input.name),
    symbol: clean(input.symbol),
    pool: clean(input.pool),
    txHash: clean(input.txHash),
    image: rawImage.startsWith("https://") ? rawImage.slice(0, 2048) : "",
    tagline: cleanLong(input.tagline, 80),
    description: cleanLong(input.description, 500),
    lore: cleanLong(input.lore, 2000),
    marketingHook: cleanLong(input.marketingHook, 120),
    xUrl: cleanLink(input.xUrl),
    webUrl: cleanLink(input.webUrl),
  };
}
