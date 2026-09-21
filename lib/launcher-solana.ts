import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";

export const PUMP_TRADE_URL = "https://pumpportal.fun/api/trade-local";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
export const DEVNET_RPC = "https://api.devnet.solana.com";
export const MAINNET_RPC_FALLBACK = "https://solana.publicnode.com";
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

export async function uploadMetadata(meta: TokenMeta, imageDataUrl?: string): Promise<string> {
  // Pinned server-side (PINATA_JWT never leaves the server): the old
  // PumpPortal /api/ipfs endpoint is dead ("Cannot POST /api/ipfs").
  let res: Response;
  try {
    res = await fetch("/api/pump-metadata", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(imageDataUrl ? { ...meta, imageData: imageDataUrl } : meta),
    });
  } catch {
    throw new Error("pump_offline");
  }
  if (!res.ok) {
    if (res.status === 429) throw new Error("pump_offline: metadata pin throttled");
    throw new Error(`pump_rejected: metadata pin failed (${res.status})`);
  }
  let data: { uri?: string };
  try {
    data = (await res.json()) as { uri?: string };
  } catch {
    throw new Error("pump_rejected: bad pin response");
  }
  if (!data.uri) throw new Error("pump_rejected: no metadata uri");
  return data.uri;
}

export type TradePayload = {
  publicKey: string;
  action: "create";
  tokenMetadata: { name: string; symbol: string; uri: string };
  mint: string;
  denominatedInSol: "true";
  amount: number;
  slippage: number;
  priorityFee: number;
  pool: string;
};

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
    tokenMetadata: { name: args.name, symbol: args.symbol, uri: args.uri },
    mint: args.mint,
    denominatedInSol: "true",
    amount: args.amountSol,
    slippage: PUMP_SLIPPAGE,
    priorityFee: PUMP_PRIORITY_FEE,
    pool: PUMP_POOL,
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
  try {
    const tx = decodeTxResponse(await res.arrayBuffer());
    validateTxBytes(tx);
    return tx;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("pump_")) throw e;
    throw new Error("pump_rejected: bad tx bytes");
  }
}

/** Decode trade-local bodies: JSON array of base58 (create), legacy base64 text, or raw bytes. */
export function decodeTxResponse(buf: ArrayBufferLike): VersionedTransaction {
  const bytes = new Uint8Array(buf);
  const text = new TextDecoder().decode(bytes).trim();
  if (text.startsWith("[")) {
    let arr: unknown;
    try {
      arr = JSON.parse(text) as unknown;
    } catch {
      throw new Error("pump_rejected: bad tx bytes");
    }
    if (!Array.isArray(arr) || typeof arr[0] !== "string" || arr[0].length === 0) {
      throw new Error("pump_rejected: empty tx bytes");
    }
    try {
      return VersionedTransaction.deserialize(bs58.decode(arr[0]));
    } catch {
      throw new Error("pump_rejected: bad tx bytes");
    }
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.replace(/\s/g, "").length > 0) {
    try {
      return VersionedTransaction.deserialize(base64ToBytes(text));
    } catch {
      throw new Error("pump_rejected: bad tx bytes");
    }
  }
  try {
    return VersionedTransaction.deserialize(bytes);
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

// --- Devnet SPL drill mint (no third party, no pump program) ---
// Canonical program ids (same on every cluster).
export const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const SPL_ATA_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const SPL_MINT_SPACE = 82;
export const SPL_DECIMALS = 9;
export const SPL_SUPPLY = 1_000_000_000;

export function splMintAmount(): bigint {
  return BigInt(SPL_SUPPLY) * 10n ** BigInt(SPL_DECIMALS);
}

/** Associated token address for (mint, owner). Pure derivation. */
export function findSplAta(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), new PublicKey(SPL_TOKEN_PROGRAM_ID).toBuffer(), mint.toBuffer()],
    new PublicKey(SPL_ATA_PROGRAM_ID),
  );
  return ata;
}

function u64le(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("bad_amount");
  return out;
}

/** 5 instructions: create mint account, init mint, create ATA, mint supply, revoke mint authority. */
export function buildSplMintInstructions(args: {
  payer: PublicKey;
  mint: PublicKey;
  ata: PublicKey;
  mintLamports: number;
  amount: bigint;
  decimals?: number;
}): TransactionInstruction[] {
  const decimals = args.decimals ?? SPL_DECIMALS;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) throw new Error("bad_metadata");
  const tokenProgram = new PublicKey(SPL_TOKEN_PROGRAM_ID);
  const initData = new Uint8Array(35);
  initData[0] = 20;
  initData[1] = decimals;
  initData.set(args.payer.toBuffer(), 2);
  initData[34] = 0; // no freeze authority
  const mintToData = new Uint8Array(9);
  mintToData[0] = 7;
  mintToData.set(u64le(args.amount), 1);
  return [
    SystemProgram.createAccount({
      fromPubkey: args.payer,
      newAccountPubkey: args.mint,
      space: SPL_MINT_SPACE,
      lamports: args.mintLamports,
      programId: tokenProgram,
    }),
    new TransactionInstruction({
      keys: [{ pubkey: args.mint, isSigner: false, isWritable: true }],
      programId: tokenProgram,
      data: Buffer.from(initData),
    }),
    new TransactionInstruction({
      keys: [
        { pubkey: args.payer, isSigner: true, isWritable: true },
        { pubkey: args.ata, isSigner: false, isWritable: true },
        { pubkey: args.payer, isSigner: false, isWritable: false },
        { pubkey: args.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey(SPL_ATA_PROGRAM_ID),
      data: Buffer.alloc(0),
    }),
    new TransactionInstruction({
      keys: [
        { pubkey: args.mint, isSigner: false, isWritable: true },
        { pubkey: args.ata, isSigner: false, isWritable: true },
        { pubkey: args.payer, isSigner: true, isWritable: false },
      ],
      programId: tokenProgram,
      data: Buffer.from(mintToData),
    }),
    new TransactionInstruction({
      keys: [
        { pubkey: args.mint, isSigner: false, isWritable: true },
        { pubkey: args.payer, isSigner: true, isWritable: false },
      ],
      programId: tokenProgram,
      data: Buffer.from(new Uint8Array([6, 0, 0])),
    }),
  ];
}

/** Unsigned drill-mint transaction (blockhash filled at send time). */
export function buildSplMintTx(args: {
  payer: PublicKey;
  mint: PublicKey;
  ata: PublicKey;
  mintLamports: number;
  amount: bigint;
}): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: args.payer,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: buildSplMintInstructions(args),
    }).compileToV0Message(),
  );
}
