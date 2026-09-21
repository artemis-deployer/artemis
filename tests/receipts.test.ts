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
    (localStorage as Storage).setItem("artemis.receipts.v1", "not-json{{{");
    expect(listReceipts()).toEqual([]);
  });

  it("drops entries without hash so one bad row never blanks the showcase", () => {
    (localStorage as Storage).setItem(
      "artemis.receipts.v1",
      JSON.stringify([
        { chainId: 4663, hash: "0xaaa", createdAt: "t1" },
        { chainId: 4663, createdAt: "t2" },
        { chainId: 4663, hash: "", createdAt: "t3" },
        null,
      ]),
    );
    expect(listReceipts().map((r) => r.hash)).toEqual(["0xaaa"]);
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

  it("treats 1-tx receipt with pool marker on same receipt as done", () => {
    const list = [{ chainId: 46630, token, hash: "0xaaa", pool: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")).toBeUndefined();
  });

  it("matches chainId across number-vs-string storage", () => {
    const asString = [{ chainId: "46630", token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(asString as never, 46630, "SPARK")?.hash).toBe("0xaaa");
    const asNumber = [{ chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(asNumber, "46630", "SPARK")?.hash).toBe("0xaaa");
  });

  it("matches ticker case-insensitively", () => {
    const list = [{ chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: "spark" }];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")?.hash).toBe("0xaaa");
    expect(findResumableEvmReceipt(list, 46630, "spark")?.hash).toBe("0xaaa");
  });

  it("treats pool-done as done even when token case differs", () => {
    const list = [
      { chainId: 46630, token: token.toUpperCase(), hash: "0xbbb", pool: "0xbbb", createdAt: "t2", ticker: "SPARK" },
      { chainId: 46630, token: token.toLowerCase(), hash: "0xaaa", createdAt: "t1", ticker: "SPARK" },
    ];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")).toBeUndefined();
  });

  it("ignores non-string ticker without throwing", () => {
    const list = [{ chainId: 46630, token, hash: "0xaaa", createdAt: "t1", ticker: 123 }];
    expect(findResumableEvmReceipt(list as never, 46630, "SPARK")).toBeUndefined();
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

  it("ignores garbage token string (isAddress guard)", () => {
    const list = [{ chainId: 46630, token: "garbage-not-an-address", hash: "0xaaa", createdAt: "t1", ticker: "SPARK" }];
    expect(findResumableEvmReceipt(list, 46630, "SPARK")).toBeUndefined();
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
