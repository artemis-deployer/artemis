# Showcase and Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/tokens` showcase page backed by a community API plus Neon, with graceful local-only fallback when no database is configured.

**Architecture:** `migrations/0001_init.sql` creates a `tokens` table. `lib/community-db.ts` wraps `@neondatabase/serverless` with parameterized queries. API routes list (GET, newest 50) and submit (POST, validated, upsert by chain+address). The page renders server-fetched tokens, falling back to localStorage receipts when the API reports `db_offline`. No secrets leak: `DATABASE_URL` server-only.

**Tech Stack:** @neondatabase/serverless, existing Next/vitest.

## Global Constraints

- Codebase language is English only — code, comments, docs, commit messages. Never Indonesian.
- `DATABASE_URL` stays server-only; never prefix with `NEXT_PUBLIC_`.
- Missing `DATABASE_URL` means local-only mode: API returns `{error: "db_offline"}`, page renders local receipts. Never crash.
- All SQL parameterized. No string-interpolated queries.
- Address validation: `0x` + 40 hex for EVM, base58 32–44 chars for Solana. Reject everything else with 400.

---

## File Structure

- `migrations/0001_init.sql` — `tokens` table + index.
- `lib/community-db.ts` — `isDbConfigured()`, `listTokens(limit)`, `saveToken(input)`.
- `lib/addresses.ts` — `classifyAddress(s): "evm" | "solana" | null`.
- `app/api/community/tokens/route.ts` — GET list, POST submit.
- `app/tokens/page.tsx` — showcase page (server component + client fallback).
- `tests/addresses.test.ts`, `tests/tokens-route.test.ts`.

---

### Task 1: Address classifier plus tests

**Files:**
- Create: `lib/addresses.ts`
- Test: `tests/addresses.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `classifyAddress(s: string): "evm" | "solana" | null` — consumed by Task 2 POST validation

- [ ] **Step 1: Write tests/addresses.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { classifyAddress } from "../lib/addresses";

describe("classifyAddress", () => {
  it("accepts 0x EVM addresses", () => {
    expect(classifyAddress("0x097716e767df17605627def0030110f8ee559ec4")).toBe("evm");
  });

  it("rejects short or non-hex 0x", () => {
    expect(classifyAddress("0x123")).toBeNull();
    expect(classifyAddress("0xZZZZ716e767df17605627def0030110f8ee559ec4")).toBeNull();
  });

  it("accepts Solana base58 mint addresses", () => {
    expect(classifyAddress("9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX")).toBe("solana");
  });

  it("rejects blanks and 0/IlO confusables", () => {
    expect(classifyAddress("")).toBeNull();
    expect(classifyAddress("0OIl1111111111111111111111111111111111")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/addresses.test.ts`
Expected: FAIL with "Cannot find module" for `../lib/addresses`.

- [ ] **Step 3: Write lib/addresses.ts**

```ts
export function classifyAddress(s: string): "evm" | "solana" | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return "solana";
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites.

- [ ] **Step 5: Commit**

```bash
git add lib/addresses.ts tests/addresses.test.ts
git commit -m 'feat: add chain address classifier'
```

### Task 2: Database layer plus community API plus tests

**Files:**
- Create: `migrations/0001_init.sql`, `lib/community-db.ts`, `app/api/community/tokens/route.ts`
- Test: `tests/tokens-route.test.ts`
- Deps: `@neondatabase/serverless`

**Interfaces:**
- Consumes: `classifyAddress` from Task 1
- Produces: `GET /api/community/tokens → {tokens: Token[]}` (or `{error: "db_offline"}` 502); `POST /api/community/tokens {chainId, address, creator?, name?, symbol?, pool?, txHash?} → {ok: true}` (400 on bad input, 502 when db offline)

- [ ] **Step 1: Install @neondatabase/serverless**

Run: `npm install @neondatabase/serverless`
Expected: installed (`--legacy-peer-deps` fallback once if needed).

- [ ] **Step 2: Write migrations/0001_init.sql**

```sql
CREATE TABLE IF NOT EXISTS tokens (
  chain_id TEXT NOT NULL,
  address TEXT NOT NULL,
  creator TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  pool TEXT NOT NULL DEFAULT '',
  tx_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, address)
);
CREATE INDEX IF NOT EXISTS tokens_created_idx ON tokens (created_at DESC);
```

Document at the top of the runbook (task report): apply once with `psql "$DATABASE_URL" -f migrations/0001_init.sql`.

- [ ] **Step 3: Write tests/tokens-route.test.ts**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/community-db", () => ({
  isDbConfigured: vi.fn(),
  listTokens: vi.fn(),
  saveToken: vi.fn(),
}));

import { GET, POST } from "../app/api/community/tokens/route";
import { isDbConfigured, listTokens, saveToken } from "../lib/community-db";

const mocked = vi.mocked({ isDbConfigured, listTokens, saveToken });

describe("tokens route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns db_offline when unconfigured", async () => {
    mocked.isDbConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("db_offline");
  });

  it("GET lists newest tokens", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.listTokens.mockResolvedValue([{ chain_id: "4663", address: "0xabc", name: "X" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { tokens: unknown[] }).tokens).toHaveLength(1);
  });

  it("POST rejects bad address with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: "nope" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST saves a good token", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: "0x097716e767df17605627def0030110f8ee559ec4", name: "LucePad" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledTimes(1);
  });

  it("POST returns db_offline when unconfigured", async () => {
    mocked.isDbConfigured.mockReturnValue(false);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: "0x097716e767df17605627def0030110f8ee559ec4" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/tokens-route.test.ts`
Expected: FAIL with "Cannot find module" for the route or db module.

- [ ] **Step 5: Write lib/community-db.ts**

```ts
import { neon } from "@neondatabase/serverless";

export type TokenRow = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
  created_at: string;
};

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function sql() {
  return neon(process.env.DATABASE_URL as string);
}

export async function listTokens(limit = 50): Promise<TokenRow[]> {
  const n = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 50;
  const rows = await sql()`SELECT * FROM tokens ORDER BY created_at DESC LIMIT ${n}`;
  return rows as TokenRow[];
}

export async function saveToken(input: {
  chainId: string;
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  pool?: string;
  txHash?: string;
}): Promise<void> {
  await sql()`INSERT INTO tokens (chain_id, address, creator, name, symbol, pool, tx_hash)
    VALUES (${input.chainId}, ${input.address}, ${input.creator ?? ""}, ${input.name ?? ""}, ${input.symbol ?? ""}, ${input.pool ?? ""}, ${input.txHash ?? ""})
    ON CONFLICT (chain_id, address) DO UPDATE SET
      creator = EXCLUDED.creator, name = EXCLUDED.name, symbol = EXCLUDED.symbol,
      pool = EXCLUDED.pool, tx_hash = EXCLUDED.tx_hash`;
}
```

NOTE: neon `sql()` template tag does not accept a dynamic LIMIT param as a plain interpolation in all versions. If `LIMIT (${limit})` fails at runtime, clamp in JS instead: `const n = Math.min(Math.max(limit, 1), 100);` then interpolate `LIMIT ${n}` — still parameterized by the driver (integer from clamped JS number, never user string). Verify with the mocked test (mock bypasses SQL) plus a typecheck; document the choice in the report.

- [ ] **Step 6: Write app/api/community/tokens/route.ts**

```ts
import { NextResponse } from "next/server";
import { classifyAddress } from "../../../../lib/addresses";
import { isDbConfigured, listTokens, saveToken } from "../../../../lib/community-db";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  try {
    return NextResponse.json({ tokens: await listTokens() });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const chainId = typeof b.chainId === "number" || typeof b.chainId === "string" ? String(b.chainId) : "";
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");
  if (!chainId || classifyAddress(address) === null) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await saveToken({
      chainId,
      address,
      creator: str(b.creator),
      name: str(b.name),
      symbol: str(b.symbol),
      pool: str(b.pool),
      txHash: str(b.txHash),
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites. Same fallback as the chat route if `next/server` fails under vitest: extract to `lib/tokens-api.ts`, thin re-export, repoint imports.

- [ ] **Step 8: Commit**

```bash
git add migrations lib/community-db.ts lib/addresses.ts app/api/community tests/addresses.test.ts tests/tokens-route.test.ts package.json package-lock.json
git commit -m 'feat: add community tokens API and database layer'
```
(Adjust the add list: `lib/addresses.ts` + `tests/addresses.test.ts` belong to Task 1's commit; if Task 1 already committed them, drop them here.)

### Task 3: Tokens showcase page

**Files:**
- Create: `app/tokens/page.tsx`
- Test: manual browser check

**Interfaces:**
- Consumes: `GET /api/community/tokens`; `listReceipts()` from Plan 1 as fallback source
- Produces: rendered showcase; empty-state copy when both sources are empty

- [ ] **Step 1: Write app/tokens/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { listReceipts, type Receipt } from "../../lib/receipts";

type Token = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [local, setLocal] = useState<Receipt[]>([]);

  useEffect(() => {
    fetch("/api/community/tokens")
      .then((r) => r.json())
      .then((j: { tokens?: Token[] }) => setTokens(Array.isArray(j.tokens) ? j.tokens : []))
      .catch(() => setTokens([]));
    setLocal(listReceipts());
  }, []);

  if (tokens === null) return <main>Loading tokens…</main>;

  return (
    <main>
      <h1>Token showcase</h1>
      {tokens.length === 0 && local.length === 0 && <p>No launches yet. Be the first spark.</p>}
      {tokens.map((t) => (
        <article key={`${t.chain_id}:${t.address}`}>
          <h2>
            {t.name || t.symbol || (t.address ?? "").slice(0, 10)}
          </h2>
          <p>
            {t.symbol} · chain {t.chain_id}
          </p>
          <p>Token: {t.address}</p>
          {t.pool && <p>Pool: {t.pool}</p>}
          {t.tx_hash && <p>Tx: {t.tx_hash}</p>}
        </article>
      ))}
      {tokens.length === 0 &&
        local.map((r, i) => (
          <article key={`${r.hash}:${i}`}>
            <h2>Local launch</h2>
            <p>Chain {String(r.chainId)}</p>
            {r.token && <p>Token: {r.token}</p>}
            <p>Tx: {r.hash}</p>
          </article>
        ))}
    </main>
  );
}
```

- [ ] **Step 2: Manual verify plus build**

Run: `npm run dev`
Expected in a real browser: `/tokens` shows the empty state (no DB configured); open `/` still renders the studio. Stop server.

Run: `npm run build` — Expected: BUILD passes
Run: `npm run lint` — Expected: 0 errors
Run: `npm test` — Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/tokens/page.tsx
git commit -m 'feat: add token showcase page'
```
