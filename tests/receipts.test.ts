import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearReceipts,
  dedupeLocalReceipts,
  findResumableEvmReceipt,
  listReceipts,
  saveReceipt,
} from "../lib/receipts";

describe("receipts", () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    clearReceipts();
  });

  it("saves and lists newest first", () => {
    saveReceipt({ chainId: 4663, hash: "0xaaa", createdAt: "t1" });
    saveReceipt({ chainId: 4663, hash: "0xbbb", createdAt: "t2" });
    const list = listReceipts();
    expect(list.map((r) => r.hash)).toEqual(["0xbbb", "0xaaa"]);
  });

  it("returns empty list when storage is corrupt", () => {
    (localStorage as Storage).setItem("kentir.receipts.v1", "not-json{{{");
    expect(listReceipts()).toEqual([]);
  });
});

describe("findResumableEvmReceipt", () => {
  const token = "0x0000000000000000000000000000000000000001";
  it("returns token receipt with no pool marker", () => {
    const list = [{ chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")?.hash).toBe("0xaaa");
  });

  it("returns undefined once pool receipt exists for same token", () => {
    const list = [
      { chainId: 46630, token, hash: "0xbbb", pool: "0xbbb", createdAt: "t2", ticker: "SPARK" },
      { chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" },
    ];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")).toBeUndefined();
  });

  it("treats legacy double receipts without pool marker as done (no double-fund)", () => {
    const list = [
      { chainId: 46630, token, hash: "0xbbb", createdAt: "t2", ticker: "SPARK" },
      { chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" },
    ];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")).toBeUndefined();
  });

  it("ignores chain or ticker mismatch", () => {
    const list = [{ chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(list, 4663, "SPARK")).toBeUndefined();
    expect(findResumableEvmReceipt(list, 46630, "OTHER")).toBeUndefined();
  });

  it("matches token address case-insensitively", () => {
    const list = [{ chainId: 46630, token: token.toUpperCase(), hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")?.hash).toBe("0xaaa");
  });
});

describe("dedupeLocalReceipts", () => {
  it("drops local receipts already present in DB, preferring DB row", () => {
    const local = [
      { chainId: 4663, token: "0xAbc0000000000000000000000000000000000001", hash: "0x1", createdAt: "t1" },
      { chainId: 4663, token: "0xDef0000000000000000000000000000000000002", hash: "0x2", createdAt: "t2" },
    ];
    const db = [{ chain_id: "4663", address: "0xabc0000000000000000000000000000000000001" }];
    const out = dedupeLocalReceipts(local, db);
    expect(out.map((r) => r.hash)).toEqual(["0x2"]);
  });

  it("keeps receipts without token address", () => {
    const local = [{ chainId: 4663, hash: "0x9", createdAt: "t1" }];
    expect(dedupeLocalReceipts(local, [])).toEqual(local);
  });
});
