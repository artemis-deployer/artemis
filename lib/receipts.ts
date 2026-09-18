export type Receipt = {
  chainId: number | string;
  token?: string;
  pool?: string;
  hash: string;
  createdAt: string;
  ticker?: string;
};

const KEY = "kentir.receipts.v1";

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveReceipt(r: Receipt): void {
  const s = store();
  if (!s) return;
  const list = listReceipts();
  list.unshift(r);
  s.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function listReceipts(): Receipt[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Receipt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearReceipts(): void {
  store()?.removeItem(KEY);
}

// ponytail: receipts lack status; pool tx hash in `pool` marks pool-done
export function findResumableEvmReceipt(
  receipts: Receipt[],
  chainId: number | string,
  ticker?: string,
): Receipt | undefined {
  const wantChain = String(chainId).toLowerCase();
  const wantTicker = ticker?.toUpperCase();
  const candidates = receipts.filter(
    (r) =>
      String(r.chainId).toLowerCase() === wantChain &&
      typeof r.token === "string" &&
      r.token.length > 0 &&
      !r.pool &&
      (!wantTicker || r.ticker === undefined || r.ticker.toUpperCase() === wantTicker),
  );
  for (const c of candidates) {
    const addr = (c.token as string).toLowerCase();
    const same = receipts.filter(
      (r) => typeof r.token === "string" && r.token.toLowerCase() === addr && String(r.chainId).toLowerCase() === wantChain,
    );
    if (same.some((r) => r.pool)) continue;
    // Legacy pool-done wrote two receipts with no pool marker; treat 2+ as done to avoid double-fund.
    if (same.length > 1) continue;
    return c;
  }
  return undefined;
}

// ponytail: prefer DB row when same token exists locally + remotely
export function dedupeLocalReceipts(
  local: Receipt[],
  community: { chain_id: string | number; address: string }[],
): Receipt[] {
  const db = new Set(community.map((t) => `${String(t.chain_id).toLowerCase()}:${t.address.toLowerCase()}`));
  return local.filter((r) => {
    if (!r.token) return true;
    return !db.has(`${String(r.chainId).toLowerCase()}:${r.token.toLowerCase()}`);
  });
}
