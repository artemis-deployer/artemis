import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

export const PUMP_TRADE_URL = "https://pumpportal.fun/api/trade-local";
export const PUMP_IPFS_URL = "https://pumpportal.fun/api/ipfs";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
export const DEVNET_RPC = "https://api.devnet.solana.com";
export const PUMP_SLIPPAGE = 10;
export const PUMP_PRIORITY_FEE = 0.0005;
export const PUMP_POOL = "pump";
export const PUMP_FEE_SOL = 0.02;

export type TokenMeta = { name: string; symbol: string; description: string; image?: string };

export function buildMetadata(args: { name: string; symbol: string; description: string; image?: string }): TokenMeta {
  const name = args.name.trim().slice(0, 32);
  const symbol = args.symbol.trim().toUpperCase().slice(0, 10);
  if (!name || !symbol) throw new Error("bad_metadata");
  return { name, symbol, description: args.description.trim().slice(0, 500), image: args.image?.trim() || undefined };
}

export async function uploadMetadata(meta: TokenMeta): Promise<string> {
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(PUMP_IPFS_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(meta),
      });
      break;
    } catch {
      if (attempt === 1) throw new Error("pump_offline");
    }
  }
  if (!res) throw new Error("pump_offline");
  if (!res.ok) throw new Error("pump_rejected: ipfs upload failed");
  let data: { metadataUri?: string; metadata_uri?: string; uri?: string };
  try {
    data = (await res.json()) as { metadataUri?: string; metadata_uri?: string; uri?: string };
  } catch {
    throw new Error("pump_rejected: bad ipfs response");
  }
  const uri = data.metadataUri ?? data.metadata_uri ?? data.uri;
  if (!uri) throw new Error("pump_rejected: no metadata uri");
  return uri;
}

export type TradePayload = Record<string, string | number>;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function buildTradePayload(args: {
  publicKey: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  amountSol: number;
}): TradePayload {
  return {
    publicKey: args.publicKey,
    action: "create",
    mint: args.mint,
    denominatedInSol: "true",
    amount: args.amountSol,
    slippage: PUMP_SLIPPAGE,
    priorityFee: PUMP_PRIORITY_FEE,
    pool: PUMP_POOL,
    name: args.name,
    symbol: args.symbol,
    uri: args.uri,
  };
}

export function inspectTxSize(b64: string): number {
  try {
    return base64ToBytes(b64).length;
  } catch {
    throw new Error("pump_rejected: bad tx bytes");
  }
}

export function validateTxBytes(tx: VersionedTransaction): void {
  const msg = tx.message as unknown as { accountKeys?: unknown[]; staticAccountKeys?: unknown[] };
  const keyCount = msg.accountKeys?.length ?? msg.staticAccountKeys?.length ?? 0;
  if (tx.serialize().length === 0 || keyCount === 0) throw new Error("pump_rejected: empty tx bytes");
}

export async function buildCreateTx(payload: TradePayload): Promise<VersionedTransaction> {
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(PUMP_TRADE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([payload]),
      });
      break;
    } catch {
      if (attempt === 1) throw new Error("pump_offline");
    }
  }
  if (!res) throw new Error("pump_offline");
  if (!res.ok) throw new Error("pump_rejected: trade-local failed");
  const b64 = (await res.text()).trim().replace(/^"|"$/g, "");
  if (!b64.length) throw new Error("pump_rejected: empty tx bytes");
  try {
    return VersionedTransaction.deserialize(base64ToBytes(b64));
  } catch {
    throw new Error("pump_rejected: bad tx bytes");
  }
}

export type SolanaWallet = {
  publicKey: { toBase58(): string };
  signTransaction<T>(tx: T): Promise<T>;
};

export async function signAndSend(args: {
  rpc: string;
  tx: VersionedTransaction;
  mintSecret: Uint8Array;
  wallet: SolanaWallet;
}): Promise<string> {
  const connection = new Connection(args.rpc, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();
  args.tx.message.recentBlockhash = blockhash;
  args.tx.sign([Keypair.fromSecretKey(args.mintSecret)]);
  const signed = await args.wallet.signTransaction(args.tx);
  const raw = signed.serialize();
  return connection.sendRawTransaction(raw, { skipPreflight: false });
}

export async function confirmTx(rpc: string, signature: string): Promise<void> {
  const connection = new Connection(rpc, "confirmed");
  const res = await connection.confirmTransaction(signature, "confirmed");
  if (res.value.err) throw new Error("tx_failed");
}

export function mapPumpError(e: unknown): string {
  if (e instanceof Error && /fetch failed|network|offline|enotfound/i.test(e.message)) return "pump_offline";
  if (e instanceof Error && e.message) return e.message;
  return "pump_failed";
}
