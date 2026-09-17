# pump.fun Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch a token on Solana via pump.fun from the browser wallet: build the create transaction through PumpPortal, sign with Phantom/Solflare plus a locally generated mint keypair, confirm, persist receipt, resume a stranded mint.

**Architecture:** `lib/launcher-solana.ts` talks to PumpPortal's HTTP API (no key needed for trade-local), uploads token metadata JSON to their IPFS endpoint, deserializes the returned base64 VersionedTransaction, and sends it through the connected wallet. The mint keypair never leaves browser memory. Devnet has no pump.fun, so devnet mode stops at a fully built, inspectable, unsent transaction (honest rehearsal, never a fake success). First real broadcast is a user-run mainnet ceremony with tiny amounts.

**Tech Stack:** @solana/web3.js, existing vitest.

## Global Constraints

- Codebase language is English only — code, comments, docs, commit messages. Never Indonesian.
- Server never signs; mint secret never leaves the browser; nothing secret is logged.
- pump.fun is mainnet-only. Devnet = build-only rehearsal, broadcast refused by design.
- Never auto-broadcast: every send follows an explicit wallet signature.

---

## File Structure

- `lib/launcher-solana.ts` — metadata builder, IPFS upload, trade-local builder, sign+send, confirm, error map.
- `components/SolanaButton.tsx` — Phantom/Solflare connect UI.
- `components/ReviewDialog.tsx` — modified: pump.fun section shown when draft route is pumpfun on a Solana chain.
- `tests/launcher-solana.test.ts` — metadata validation, payload builder, error map, deserialization of a canned tx fixture.

---

### Task 1: Solana launcher library plus tests

**Files:**
- Create: `lib/launcher-solana.ts`
- Test: `tests/launcher-solana.test.ts`
- Deps: `@solana/web3.js`

**Interfaces:**
- Consumes: `Receipt`, `saveReceipt` from Plan 1
- Produces: `buildMetadata(args)`, `uploadMetadata(meta)`, `buildCreateTx(args)`, `signAndSend(txBase64, mintSecret, wallet)`, `confirmTx(sig)`, `mapPumpError(e)` — consumed by Task 2

- [ ] **Step 1: Install @solana/web3.js**

Run: `npm install @solana/web3.js`
Expected: installed (`--legacy-peer-deps` fallback once if the arborist fails).

- [ ] **Step 2: Write tests/launcher-solana.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { buildMetadata, buildTradePayload, mapPumpError } from "../lib/launcher-solana";

describe("buildMetadata", () => {
  it("builds pump metadata json", () => {
    const m = buildMetadata({ name: "Kopi", symbol: "KOPI", description: "d" });
    expect(m).toMatchObject({ name: "Kopi", symbol: "KOPI", description: "d" });
  });

  it("rejects blank name or symbol", () => {
    expect(() => buildMetadata({ name: "", symbol: "X", description: "" })).toThrow();
    expect(() => buildMetadata({ name: "X", symbol: "", description: "" })).toThrow();
  });
});

describe("buildTradePayload", () => {
  it("shapes a create payload for trade-local", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p).toMatchObject({ action: "create", pool: "pump", denominatedInSol: "true" });
    expect(p.slippage).toBeGreaterThan(0);
  });
});

describe("mapPumpError", () => {
  it("maps network failure to offline", () => {
    expect(mapPumpError(new Error("fetch failed"))).toBe("pump_offline");
  });

  it("passes through explicit codes", () => {
    expect(mapPumpError(new Error("pump_rejected: nope"))).toBe("pump_rejected: nope");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/launcher-solana.test.ts`
Expected: FAIL with "Cannot find module" for `../lib/launcher-solana`.

- [ ] **Step 4: Write lib/launcher-solana.ts**

```ts
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
```

Decided during Task 1: no bs58 usage exists in the lib, so no wrapper and no new dep. Do not add one.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites. Fix lib, not tests, unless the test contradicts this brief.

- [ ] **Step 6: Commit**

```bash
git add lib/launcher-solana.ts lib/bs58.ts tests/launcher-solana.test.ts package.json package-lock.json
git commit -m 'feat: add Solana pump.fun launcher library'
```

(Adjust the `git add` list to what actually exists: include `lib/bs58.ts` only if created, and `bs58` dep changes come via package files.)

### Task 2: Solana UI wiring plus rehearsal plus ceremony

**Files:**
- Create: `components/SolanaButton.tsx`
- Modify: `components/ReviewDialog.tsx` (pump section when `draft.route === "pumpfun"` and chain is Solana)
- Test: manual rehearsal + mainnet ceremony checklist below

**Interfaces:**
- Consumes: Task 1 builders; `saveReceipt` from Plan 1; draft via props
- Produces: working pump.fun launch UI; stranded-mint resume via receipts

- [ ] **Step 1: Write components/SolanaButton.tsx**

```tsx
"use client";

import { useState } from "react";

type Provider = {
  publicKey: { toBase58(): string };
  connect(): Promise<unknown>;
};

function pickProvider(): Provider | null {
  const w = window as unknown as { phantom?: { solana?: Provider }; solflare?: Provider; solana?: Provider };
  const p = w.phantom?.solana ?? w.solflare ?? w.solana;
  return p && typeof p.connect === "function" ? p : null;
}

export function getSolanaProvider(): Provider | null {
  return pickProvider();
}

export default function SolanaButton({ onConnect }: { onConnect: (p: Provider) => void }) {
  const [label, setLabel] = useState("Connect Solana wallet");
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    const p = pickProvider();
    if (!p) {
      setError("Install Phantom or Solflare first.");
      return;
    }
    try {
      await p.connect();
      setLabel(p.publicKey.toBase58().slice(0, 4) + "…" + p.publicKey.toBase58().slice(-4));
      onConnect(p);
    } catch {
      setError("Wallet connection rejected.");
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void connect()}>
        {label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Extend ReviewDialog with the pump section**

In `components/ReviewDialog.tsx`:
1. Import `Keypair` from `@solana/web3.js`, the Task 1 builders, `getSolanaProvider` + `SolanaButton`, and `listReceipts`.
2. Track `provider`, `mint` (base58 string), `pump` state (`idle | working | built | sent | error`), `note`.
3. Show this section only when `draft.route === "pumpfun"` and `String(draft.chainId).startsWith("solana")`.
4. Flow `launchPump()`:
   - devnet → build metadata + payload + tx bytes via `buildCreateTx`, then stop before broadcast with note "Devnet rehearsal: transaction built (N bytes), broadcast refused by design." `signAndSend` stays unreachable on devnet. Offline build failure maps to `error`, never fake `built`.
   - mainnet → upload metadata → new `Keypair()` mint (memory only) → `buildCreateTx` → `signAndSend` with `mint.secretKey` → `confirmTx` → save receipt `{chainId, token: mintBase58, hash: sig}` → state `sent`.
   - Any throw → `mapPumpError` into note, state `error`.
5. Resume: if a receipt exists with matching draft ticker and no pool, show "Resume: open the mint in explorer" linking `${explorer}/address/${token}` (pump.fun graduation is tracked on pump.fun itself; do not claim auto-detect).
6. Wrap every network call in try/catch → note; never leave `working` stuck (finally resets to `idle` on error paths already covered by catch setting `error`).

- [ ] **Step 3: Manual verify plus build**

Run: `npm run build` — Expected: BUILD passes
Run: `npm run lint` — Expected: 0 errors
Run: `npm test` — Expected: PASS

- [ ] **Step 4: Rehearsal checklist (no funds)**

1. `npm run dev`, pick Solana Devnet, route pumpfun, open review.
2. Click through to the built-transaction note without connecting funds.
3. Record observed states in the task report.

- [ ] **Step 5: Commit**

```bash
git add components/SolanaButton.tsx components/ReviewDialog.tsx
git commit -m 'feat: add pump.fun launch wiring'
```
