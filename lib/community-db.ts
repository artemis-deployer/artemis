import postgres from "postgres";

export type TokenRow = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
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
}): Promise<void> {
  const t = normalizeTokenInput(input);
  await sql()`INSERT INTO tokens (chain_id, address, creator, name, symbol, pool, tx_hash)
    VALUES (${t.chainId}, ${t.address}, ${t.creator}, ${t.name}, ${t.symbol}, ${t.pool}, ${t.txHash})
    ON CONFLICT (chain_id, address) DO UPDATE SET
      creator = EXCLUDED.creator, name = EXCLUDED.name, symbol = EXCLUDED.symbol,
      pool = EXCLUDED.pool, tx_hash = EXCLUDED.tx_hash`;
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
}): {
  chainId: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  txHash: string;
} {
  // ponytail: Array.from slices by code point, never splits surrogate pairs (lone surrogates break Postgres UTF-8)
  const clean = (v: unknown) => (typeof v === "string" ? Array.from(v.trim()).slice(0, 200).join("") : "");
  return {
    chainId: String(input.chainId ?? "").trim(),
    address: String(input.address ?? "").trim(),
    creator: clean(input.creator),
    name: clean(input.name),
    symbol: clean(input.symbol),
    pool: clean(input.pool),
    txHash: clean(input.txHash),
  };
}
