import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearReceipts, listReceipts, saveReceipt } from "../lib/receipts";

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
