import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

export const PUMP_TRADE_URL = "https://pumpportal.fun/api/trade-local";
export const PUMP_IPFS_URL = "https://pumpportal.fun/api/ipfs";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
export const DEVNET_RPC = "https://api.devnet.solana.com";

export type TokenMeta = { name: string; symbol: string; description: string; image?: string };

export function buildMetadata(args: { name: string; symbol: string; description: string; image?: string }): TokenMeta {
  const name = args.name.trim().slice(0, 32);
  const symbol = args.symbol.trim().toUpperCase().slice(0, 10);
  if (!name || !symbol) throw new Error("bad_metadata");
  return { name, symbol, description: args.description.trim().slice(0, 500), image: args.image?.trim() || undefined };
}

export async function uploadMetadata(meta: TokenMeta): Promise<string> {
  let res: Response;
  try {
    res = await fetch(PUMP_IPFS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(meta),
    });
  } catch {
    throw new Error("pump_offline");
  }
  if (!res.ok) throw new Error("pump_rejected: ipfs upload failed");
  const data = (await res.json()) as { metadataUri?: string; metadata_uri?: string; uri?: string };
  const uri = data.metadataUri ?? data.metadata_uri ?? data.uri;
  if (!uri) throw new Error("pump_rejected: no metadata uri");
  return uri;
}

export type TradePayload = Record<string, string | number>;

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
    slippage: 10,
    priorityFee: 0.0005,
    pool: "pump",
    name: args.name,
    symbol: args.symbol,
    uri: args.uri,
  };
}

export async function buildCreateTx(payload: TradePayload): Promise<VersionedTransaction> {
  let res: Response;
  try {
    res = await fetch(PUMP_TRADE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([payload]),
    });
  } catch {
    throw new Error("pump_offline");
  }
  if (!res.ok) throw new Error("pump_rejected: trade-local failed");
  const b64 = (await res.text()).trim().replace(/^"|"$/g, "");
  return VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
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
