import { Connection } from "@solana/web3.js";
import { getHoodConfig, publicClientFor } from "./launcher-evm";

export type EvmReceiptLike = {
  contractAddress?: string | null;
  to?: string | null;
  from?: string;
  logs: { address: string }[];
};

// Case-insensitive match: the showcased address must appear as the created
// contract, tx sender/recipient, or in one of the receipt log addresses.
export function matchEvmReceipt(receipt: EvmReceiptLike, address: string): boolean {
  const want = address.toLowerCase();
  for (const candidate of [receipt.contractAddress, receipt.to, receipt.from]) {
    if (typeof candidate === "string" && candidate.toLowerCase() === want) return true;
  }
  for (const log of receipt.logs ?? []) {
    if (typeof log?.address === "string" && log.address.toLowerCase() === want) return true;
  }
  return false;
}

// True only if the hash is a confirmed successful tx involving the address.
// Any RPC error or unexpected shape means "not proven" (false), never throw.
export async function verifyEvmTx(
  chainId: 4663 | 46630,
  address: string,
  txHash: string,
  expectedFrom?: string,
): Promise<boolean> {
  try {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return false;
    const cfg = getHoodConfig(chainId);
    if (!cfg) return false;
    const receipt = await publicClientFor(cfg).getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== "success") return false;
    if (expectedFrom !== undefined && /^0x[0-9a-fA-F]{40}$/.test(expectedFrom)) {
      if (typeof receipt.from !== "string" || receipt.from.toLowerCase() !== expectedFrom.toLowerCase()) {
        return false;
      }
    }
    return matchEvmReceipt(
      receipt as unknown as EvmReceiptLike,
      address,
    );
  } catch {
    return false;
  }
}

// Exact base58 mint match against a list of account keys.
export function mintInKeys(keys: string[], mint: string): boolean {
  return keys.includes(mint);
}

type KeyLike = string | { toBase58?: () => string };

function keyToBase58(key: KeyLike): string | null {
  if (typeof key === "string") return key;
  if (key && typeof key.toBase58 === "function") {
    try {
      return key.toBase58() as string;
    } catch {
      return null;
    }
  }
  return null;
}

function extractAccountKeys(message: unknown): string[] {
  if (!message || typeof message !== "object") return [];
  const msg = message as {
    getAccountKeys?: () => { staticAccountKeys?: KeyLike[] } | KeyLike[];
    staticAccountKeys?: KeyLike[];
    accountKeys?: KeyLike[];
  };
  // Preferred modern API: message.getAccountKeys() returns keys or { staticAccountKeys }.
  if (typeof msg.getAccountKeys === "function") {
    try {
      const got = msg.getAccountKeys();
      const list = Array.isArray(got) ? got : (got?.staticAccountKeys ?? []);
      return list.map(keyToBase58).filter((k): k is string => typeof k === "string");
    } catch {
      return [];
    }
  }
  const raw = msg.staticAccountKeys ?? msg.accountKeys ?? [];
  return raw.map(keyToBase58).filter((k): k is string => typeof k === "string");
}

// True only if the signature is confirmed/finalized without error and the
// mint appears in the transaction's account keys. A null transaction body
// (pruned history) proves nothing about the mint, so return false.
// Any RPC error means "not proven" (false).
export async function verifySolanaTx(rpc: string, mint: string, sig: string, expectedCreator?: string): Promise<boolean> {
  try {
    if (!/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(sig)) return false;
    const connection = new Connection(rpc, "confirmed");
    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value?.[0];
    if (!status || status.err !== null) return false;
    if (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized") return false;
    const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (!tx) return false;
    const message = (tx.transaction as unknown as { message?: unknown })?.message;
    const keys = extractAccountKeys(message);
    if (!mintInKeys(keys, mint)) return false;
    if (expectedCreator !== undefined && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(expectedCreator)) {
      if (!keys.includes(expectedCreator)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
