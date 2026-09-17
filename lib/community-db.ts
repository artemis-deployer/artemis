import { neon } from "@neondatabase/serverless";

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

function sql() {
  return neon(process.env.DATABASE_URL as string);
}

export async function listTokens(limit = 50): Promise<TokenRow[]> {
  const n = Math.min(Math.max(Math.floor(limit), 1), 100);
  const rows = await sql()`SELECT * FROM tokens ORDER BY created_at DESC LIMIT ${n}`;
  return rows as TokenRow[];
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
  await sql()`INSERT INTO tokens (chain_id, address, creator, name, symbol, pool, tx_hash)
    VALUES (${input.chainId}, ${input.address}, ${input.creator ?? ""}, ${input.name ?? ""}, ${input.symbol ?? ""}, ${input.pool ?? ""}, ${input.txHash ?? ""})
    ON CONFLICT (chain_id, address) DO UPDATE SET
      creator = EXCLUDED.creator, name = EXCLUDED.name, symbol = EXCLUDED.symbol,
      pool = EXCLUDED.pool, tx_hash = EXCLUDED.tx_hash`;
}
