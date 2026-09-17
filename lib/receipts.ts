export type Receipt = {
  chainId: number | string;
  token?: string;
  pool?: string;
  hash: string;
  createdAt: string;
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
