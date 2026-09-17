# Foundation (Scaffold, Studio, AI Chat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working studio page with AI draft chat, chain picker shell, launch form, and review dialog UI — no chain transactions yet.

**Architecture:** Next.js App Router renders studio client components. Chat API route proxies Mimo v2.5 with a server-only key and returns a strict draft JSON the form consumes. Draft state lives in a React context. Receipts persist in localStorage. All chain work arrives in later plans.

**Tech Stack:** Next 16.3.4, React 19.2.8, Tailwind CSS v4 (@tailwindcss/postcss), TypeScript 5, vitest 4.1.11, three (character only), npm.

**Execution order:** 1, 2, 3, 4, 6, 5 — Task 6 (CharacterStage) must land before Task 5 because the page composition build gate imports it.

## Global Constraints

- Codebase language is English only — code, comments, docs, commit messages. Never Indonesian.
- Free Vercel limit (~60s per function): server routes do chat + catalog only, never chain tx.
- Server never signs transactions and never holds user funds or private keys.
- `LLM_API_KEY` stays server-only; never prefix with `NEXT_PUBLIC_`.
- Chat composer maxlength is 1000 characters.
- Direct-pool supply constant is 999000000 (used in later plans; defined here in one place).
- Missing `LLM_API_URL` or `LLM_API_KEY` means chat-off mode: status badge shows offline, form still works.

---

## File Structure

- `package.json` — scripts dev/build/start/lint/test, deps listed per task.
- `tsconfig.json` — strict, bundler resolution, `@/*` maps to `./src/*` (not needed yet; keep flat: `./components/*`, `./lib/*`, `./app/*`).
- `next.config.ts` — default export, no custom config v1.
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin.
- `app/globals.css` — tailwind import plus CSS vars for theme.
- `app/layout.tsx` — html shell, metadata title "Kentir — launch your coin".
- `app/page.tsx` — composes studio: StatusBadge, StudioChat, LaunchForm, CharacterStage.
- `lib/chains.ts` — `CHAINS` list (Hood 4663, Solana mainnet, Hood testnet 46630, Solana devnet), `getChain(id)` lookup. No RPC calls here.
- `lib/draft.ts` — `Draft` type plus `parseDraftReply(text)` extracting `{name, ticker, pooled, liquidity, route}` from model JSON, plus `validateDraft(d)` returning string errors.
- `lib/receipts.ts` — `saveReceipt(r)`, `listReceipts()`, `clearReceipts()` over `localStorage` key `kentir.receipts.v1`.
- `lib/webgl.ts` — `isWebGLAvailable()` probe used by CharacterStage fallback.
- `components/StatusBadge.tsx` — client, GETs `/api/status`, renders online/offline.
- `components/StudioChat.tsx` — client composer + log + suggestion buttons, POSTs `/api/chat`.
- `components/LaunchForm.tsx` — client form bound to draft context, chain picker, consent checkbox for mainnets.
- `components/ReviewDialog.tsx` — native `<dialog>` summary + consent + blocked-launch state (buttons disabled until launcher plans land; shows "Launcher lands in Plan 2/3").
- `components/CharacterStage.tsx` — three.js canvas with drag rotate plus PNG fallback when WebGL missing.
- `components/DraftContext.tsx` — React context holding draft + setter shared by StudioChat and LaunchForm.
- `app/api/status/route.ts` — GET returns `{configured, model, networks}`.
- `app/api/chat/route.ts` — POST proxies Mimo v2.5 OpenAI-compatible endpoint, enforces system prompt + draft JSON contract.
- `vitest.config.ts` — node environment for lib tests, jsdom-free.
- `tests/draft.test.ts`, `tests/receipts.test.ts`, `tests/chains.test.ts`, `tests/chat-route.test.ts`, `tests/webgl.test.ts`.
- `.env.example` — `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL=mimo-v2.5`, `DATABASE_URL` (unused until Plan 4).

Later plans own: `lib/launcher-evm.ts` (Plan 2), `lib/launcher-solana.ts` (Plan 3), `/tokens` + community API + Neon (Plan 4).

---

### Task 1: Scaffold app shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (placeholder heading only), `.env.example`, `.gitignore`
- Test: `npm run build` passes, `npm run lint` passes

**Interfaces:**
- Consumes: nothing
- Produces: runnable Next dev server on port 3000; `app/page.tsx` default export used by all later tasks

- [ ] **Step 1: Write package.json**

```json
{
  "name": "kentir",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "16.3.4",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.11"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Write postcss.config.mjs**

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

- [ ] **Step 5: Write eslint.config.mjs**

`eslint-config-next@16` is flat-native; do NOT use FlatCompat (`@eslint/eslintrc` crashes on its circular plugin objects). Write:

```js
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [...nextVitals, ...nextTs, { ignores: [".next/", "next-env.d.ts"] }];

export default config;
```

Expected: `npm run lint` exits 0. No extra eslint deps needed.

- [ ] **Step 6: Write app/globals.css**

```css
@import "tailwindcss";

:root {
  --ink: #141210;
  --paper: #fff9f1;
  --accent: #b82535;
}

body {
  background: var(--paper);
  color: var(--ink);
}
```

- [ ] **Step 7: Write app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kentir — launch your coin",
  description: "Chat an idea into a token draft, then launch it from your own wallet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Write app/page.tsx placeholder**

```tsx
export default function Home() {
  return (
    <main>
      <h1>Kentir</h1>
      <p>Studio lands in Task 5.</p>
    </main>
  );
}
```

- [ ] **Step 9: Write .env.example**

```text
LLM_API_URL=https://token-plan-sgp.xiaomimimo.com/v1/chat/completions
LLM_API_KEY=
LLM_MODEL=mimo-v2.5
DATABASE_URL=
```

- [ ] **Step 10: Write .gitignore** (MERGE into existing file, do not overwrite — it already holds this content plus a `.superpowers/` line)

```text
node_modules
.next
.env.local
*.log
```

- [ ] **Step 11: Install and verify build**

Run: `npm install`
Expected: installs without errors. Fallback: if pristine install fails inside the npm arborist (`edgesOut` null error with npm 11 + vitest 4), rerun once with `npm install --legacy-peer-deps` and note it in the report.

Run: `npm run build`
Expected: BUILD passes, route `/` listed

Run: `npm run lint`
Expected: no errors (warnings acceptable, fix if trivial)

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs app .env.example .gitignore
git commit -m 'feat: scaffold Next.js studio shell'
```

### Task 2: Chain registry plus draft plus receipts libs

**Files:**
- Create: `lib/chains.ts`, `lib/draft.ts`, `lib/receipts.ts`
- Test: `tests/chains.test.ts`, `tests/draft.test.ts`, `tests/receipts.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `getChain(id: number | string)`, `parseDraftReply(text: string): Partial<Draft>`, `validateDraft(d: Partial<Draft>): string[]`, `saveReceipt(r: Receipt)`, `listReceipts(): Receipt[]` — used by Tasks 4, 5, 6 and Plans 2–4

- [ ] **Step 1: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write tests/chains.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { CHAINS, DIRECT_SUPPLY, getChain } from "../lib/chains";

describe("chains", () => {
  it("finds Hood mainnet by id", () => {
    expect(getChain(4663)?.name).toBe("Robinhood Chain");
  });

  it("returns undefined for unknown chain", () => {
    expect(getChain(999999)).toBeUndefined();
  });

  it("pins direct supply", () => {
    expect(DIRECT_SUPPLY).toBe(999000000);
    expect(CHAINS.length).toBe(4);
  });
});
```

- [ ] **Step 3: Write tests/draft.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { parseDraftReply, validateDraft } from "../lib/draft";

describe("parseDraftReply", () => {
  it("extracts draft JSON embedded in prose", () => {
    const out = parseDraftReply('Sure! Here it is {"ticker":"ember","pooled":"800000"} done');
    expect(out.ticker).toBe("EMBER");
    expect(out.pooled).toBe("800000");
  });

  it("returns empty object when no JSON present", () => {
    expect(parseDraftReply("no json here")).toEqual({});
  });

  it("returns empty object on broken JSON", () => {
    expect(parseDraftReply('{"ticker":')).toEqual({});
  });
});

describe("validateDraft", () => {
  it("requires ticker", () => {
    expect(validateDraft({})).toContain("ticker is required");
  });

  it("rejects non-positive numbers", () => {
    expect(validateDraft({ ticker: "X", pooled: "-5" })).toContain("pooled must be a positive number");
    expect(validateDraft({ ticker: "X", liquidity: "abc" })).toContain("liquidity must be a positive number");
  });

  it("accepts a good draft", () => {
    expect(validateDraft({ ticker: "EMBER", pooled: "800000", liquidity: "0.1" })).toEqual([]);
  });
});
```

- [ ] **Step 4: Write tests/receipts.test.ts**

```ts
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
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with "Cannot find module" or "Failed to resolve import" for `../lib/chains`. This proves the tests execute before the implementation exists.

- [ ] **Step 6: Write lib/chains.ts**

```ts
export type Chain = {
  id: number | string;
  name: string;
  currency: string;
  testnet: boolean;
  explorer: string;
};

export const CHAINS: Chain[] = [
  { id: 4663, name: "Robinhood Chain", currency: "ETH", testnet: false, explorer: "https://robinhoodchain.blockscout.com" },
  { id: "solana-mainnet", name: "Solana", currency: "SOL", testnet: false, explorer: "https://solscan.io" },
  { id: 46630, name: "Robinhood Testnet", currency: "ETH", testnet: true, explorer: "https://explorer.testnet.chain.robinhood.com" },
  { id: "solana-devnet", name: "Solana Devnet", currency: "SOL", testnet: true, explorer: "https://solscan.io?cluster=devnet" },
];

export function getChain(id: number | string): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}

export const DIRECT_SUPPLY = 999000000;
```

- [ ] **Step 7: Write lib/draft.ts**

```ts
export type Draft = {
  name: string;
  ticker: string;
  pooled: string;
  liquidity: string;
  route: "direct" | "pumpfun";
  chainId: number | string;
};

export const EMPTY_DRAFT: Draft = {
  name: "",
  ticker: "",
  pooled: "",
  liquidity: "",
  route: "direct",
  chainId: 46630,
};

export function parseDraftReply(text: string): Partial<Draft> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const out: Partial<Draft> = {};
    if (typeof raw.name === "string") out.name = raw.name.slice(0, 32);
    if (typeof raw.ticker === "string") out.ticker = raw.ticker.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
    if (typeof raw.pooled === "string") out.pooled = raw.pooled;
    if (typeof raw.liquidity === "string") out.liquidity = raw.liquidity;
    if (raw.route === "pumpfun" || raw.route === "direct") out.route = raw.route;
    return out;
  } catch {
    return {};
  }
}

export function validateDraft(d: Partial<Draft>): string[] {
  const errors: string[] = [];
  if (!d.ticker || d.ticker.length === 0) errors.push("ticker is required");
  if (d.ticker && d.ticker.length > 12) errors.push("ticker is too long");
  if (d.pooled !== undefined && d.pooled !== "" && !(Number(d.pooled) > 0)) errors.push("pooled must be a positive number");
  if (d.liquidity !== undefined && d.liquidity !== "" && !(Number(d.liquidity) > 0)) errors.push("liquidity must be a positive number");
  return errors;
}
```

- [ ] **Step 8: Write lib/receipts.ts**

```ts
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
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites. If any FAIL, fix lib code, not test expectations, unless the test contradicts the spec.

- [ ] **Step 10: Commit**

```bash
git add lib tests vitest.config.ts
git commit -m 'feat: add chain registry, draft parsing, receipts store'
```

### Task 3: Status endpoint plus chat endpoint

**Files:**
- Create: `app/api/status/route.ts`, `app/api/chat/route.ts`
- Test: `tests/chat-route.test.ts` (status covered by fetch shape test inline)

**Interfaces:**
- Consumes: `parseDraftReply` from Task 2 (chat route does not parse; client does — route returns raw text)
- Produces: `GET /api/status → {configured: boolean, model: string, networks: {id, name, testnet}[]}`; `POST /api/chat {messages: {role, content}[], draft: Draft} → {reply: string} | {error: string}` with 502 + `{error: "chat_offline"}` when unconfigured

- [ ] **Step 1: Write tests/chat-route.test.ts**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as statusGET } from "../app/api/status/route";
import { POST as chatPOST } from "../app/api/chat/route";

describe("status route", () => {
  it("reports unconfigured when env is missing", async () => {
    vi.stubEnv("LLM_API_URL", "");
    vi.stubEnv("LLM_API_KEY", "");
    const res = await statusGET();
    const json = (await res.json()) as { configured: boolean; networks: unknown[] };
    expect(json.configured).toBe(false);
    expect(json.networks.length).toBe(4);
  });
});

describe("chat route", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubEnv("LLM_API_URL", "https://example.test/v1/chat/completions");
    vi.stubEnv("LLM_API_KEY", "secret");
  });

  it("returns 502 chat_offline when unconfigured", async () => {
    vi.stubEnv("LLM_API_URL", "");
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("chat_offline");
  });

  it("rejects empty messages with 400", async () => {
    const req = new Request("http://x/api/chat", { method: "POST", body: JSON.stringify({ messages: [] }) });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("rejects malformed message items with 400", async () => {
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user" }, null, "hi"] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  it("proxies to upstream and returns reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hi {\"ticker\":\"X\"}" } }] }),
    }));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "make a coin" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { reply: string }).reply).toContain("hi");
  });

  it("maps upstream failure to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
  });

  it("maps network failure to 502 chat_offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const req = new Request("http://x/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("chat_offline");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/chat-route.test.ts`
Expected: FAIL with "Cannot find module" or "Failed to resolve import" for the route files.

- [ ] **Step 3: Write app/api/status/route.ts**

```ts
import { NextResponse } from "next/server";
import { CHAINS } from "../../../lib/chains";

export async function GET() {
  const configured = Boolean(process.env.LLM_API_URL && process.env.LLM_API_KEY);
  return NextResponse.json({
    configured,
    model: process.env.LLM_MODEL ?? "mimo-v2.5",
    networks: CHAINS.map((c) => ({ id: c.id, name: c.name, testnet: c.testnet })),
  });
}
```

- [ ] **Step 4: Write app/api/chat/route.ts**

```ts
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "You are Kentir, a coin launch copilot.",
  "Help the user shape a token draft: name, ticker, pool tokens, starting liquidity, route.",
  "Always end your reply with one fenced JSON block holding draft keys:",
  '{"name": string, "ticker": string, "pooled": string, "liquidity": string, "route": "direct" | "pumpfun"}.',
  "Supply is fixed and never editable: 999000000 direct, 1000000000 pumpfun.",
  "Never ask for private keys or recovery phrases. Never claim to sign transactions.",
].join(" ");

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const url = process.env.LLM_API_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "mimo-v2.5";
  if (!url || !key) return NextResponse.json({ error: "chat_offline" }, { status: 502 });

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const rawItems: unknown = body.messages;
  const raw = Array.isArray(rawItems) ? rawItems : [];
  const messages = raw.filter(
    (m): m is ChatMessage =>
      typeof m === "object" &&
      m !== null &&
      ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
      typeof (m as ChatMessage).content === "string",
  );
  if (messages.length === 0 || messages.some((m) => m.content.length === 0 || m.content.length > 1000)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const trimmed = messages.slice(-20);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.7,
      }),
    });
  } catch {
    return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  } catch {
    return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  }
  const reply = data.choices?.[0]?.message?.content ?? "";
  if (!reply) return NextResponse.json({ error: "chat_offline" }, { status: 502 });
  return NextResponse.json({ reply });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites including Task 2 suites. If any FAIL on logic, fix route code, not test expectations, unless the test contradicts the spec.

Fallback (import failure only): if the run fails importing `next/server` under vitest (unresolvable or edge-runtime error), do not fight the bundler. Extract the handler bodies into `lib/chat.ts` (`export async function postChat(req: Request): Promise<Response>`) and `lib/status.ts` (`export async function getStatus(): Promise<Response>`), keep both route files as thin re-exports, repoint the test imports at the lib files, rerun, and add the lib files to the Step 6 commit.

- [ ] **Step 6: Commit**

```bash
git add app/api tests/chat-route.test.ts
git commit -m 'feat: add status and chat API routes'
```

### Task 4: Draft context plus chat UI plus status badge

**Files:**
- Create: `components/DraftContext.tsx`, `components/StudioChat.tsx`, `components/StatusBadge.tsx`
- Test: manual browser check (client components; logic already covered in Task 2)

**Interfaces:**
- Consumes: `EMPTY_DRAFT`, `parseDraftReply` from Task 2; `POST /api/chat` from Task 3
- Produces: `DraftProvider` + `useDraft()` used by Task 5 form; chat posts messages and merges parsed draft

- [ ] **Step 1: Write components/DraftContext.tsx**

```tsx
"use client";

import { createContext, useContext, useState } from "react";
import { EMPTY_DRAFT, type Draft } from "../lib/draft";

const DraftCtx = createContext<{ draft: Draft; setDraft: (d: Draft) => void }>({
  draft: EMPTY_DRAFT,
  setDraft: () => undefined,
});

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  return <DraftCtx.Provider value={{ draft, setDraft }}>{children}</DraftCtx.Provider>;
}

export function useDraft() {
  return useContext(DraftCtx);
}
```

- [ ] **Step 2: Write components/StatusBadge.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";

export default function StatusBadge() {
  const [label, setLabel] = useState("Connecting…");
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j: { configured: boolean }) => setLabel(j.configured ? "AI connected" : "AI offline · manual form works"))
      .catch(() => setLabel("AI offline · manual form works"));
  }, []);
  return <span role="status">{label}</span>;
}
```

- [ ] **Step 3: Write components/StudioChat.tsx**

```tsx
"use client";

import { useState } from "react";
import { parseDraftReply } from "../lib/draft";
import { useDraft } from "./DraftContext";

type Line = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["A coin for my community", "Help me name my coin"];

export default function StudioChat() {
  const { draft, setDraft } = useDraft();
  const [log, setLog] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    const content = text.trim().slice(0, 1000);
    if (!content || busy) return;
    setBusy(true);
    const next = [...log, { role: "user" as const, content }];
    setLog(next);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = (await res.json()) as { reply?: string };
      const reply = json.reply ?? "AI offline · use the form directly.";
      setLog([...next, { role: "assistant" as const, content: reply }]);
      const patch = parseDraftReply(reply);
      setDraft({ ...draft, ...patch });
    } catch {
      setLog([...next, { role: "assistant" as const, content: "AI offline · use the form directly." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Talk to Kentir">
      <div aria-live="polite">
        {log.map((l, i) => (
          <p key={i}>
            <strong>{l.role === "user" ? "You" : "Kentir"}:</strong> {l.content}
          </p>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-input">Tell Kentir about your coin</label>
        <textarea id="chat-input" rows={2} maxLength={1000} value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
      <div>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Manual verify in browser**

Run: `npm run dev`
Expected: badge shows offline without env; typing + Send with `LLM_*` unset shows offline fallback line; no console errors. Stop server.

Run: `npm run build`
Expected: BUILD passes (typechecks the new client components).

- [ ] **Step 5: Commit**

```bash
git add components/DraftContext.tsx components/StudioChat.tsx components/StatusBadge.tsx
git commit -m 'feat: add draft context, chat UI, status badge'
```

### Task 5: Launch form plus review dialog plus page composition

**Files:**
- Create: `components/LaunchForm.tsx`, `components/ReviewDialog.tsx`
- Modify: `app/page.tsx` (compose everything inside DraftProvider)
- Test: validation via Task 2 suite; manual browser check

**Interfaces:**
- Consumes: `useDraft`, `CHAINS`, `validateDraft` from Tasks 2/4
- Produces: completed studio page; launch buttons stay disabled with "Launcher lands in Plan 2/3" note

- [ ] **Step 1: Write components/LaunchForm.tsx**

```tsx
"use client";

import { CHAINS } from "../lib/chains";
import { validateDraft } from "../lib/draft";
import { useDraft } from "./DraftContext";

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft } = useDraft();
  const errors = validateDraft(draft);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];

  return (
    <section aria-label="Your launch">
      <label>
        Coin name (optional)
        <input value={draft.name} maxLength={32} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label>
        Ticker (required)
        <input
          value={draft.ticker}
          maxLength={12}
          onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
        />
      </label>
      <label>
        Chain
        <select
          value={String(draft.chainId)}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft({ ...draft, chainId: isNaN(Number(raw)) ? raw : Number(raw) });
          }}
        >
          {CHAINS.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.name}
              {c.testnet ? " (test)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tokens for the pool
        <input value={draft.pooled} inputMode="decimal" onChange={(e) => setDraft({ ...draft, pooled: e.target.value })} />
      </label>
      <label>
        Starting liquidity ({chain.currency})
        <input value={draft.liquidity} inputMode="decimal" onChange={(e) => setDraft({ ...draft, liquidity: e.target.value })} />
      </label>
      {errors.map((x) => (
        <p key={x} role="alert">
          {x}
        </p>
      ))}
      <button type="button" disabled={errors.length > 0} onClick={onReview}>
        Review your launch
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Write components/ReviewDialog.tsx**

```tsx
"use client";

import { forwardRef } from "react";
import type { Draft } from "../lib/draft";
import { DIRECT_SUPPLY } from "../lib/chains";

const ReviewDialog = forwardRef<HTMLDialogElement, { draft: Draft; mainnet: boolean }>(function ReviewDialog(
  { draft, mainnet },
  ref,
) {
  return (
    <dialog ref={ref} aria-label="Review your launch">
      <h2>Ready to begin?</h2>
      <dl>
        <dt>Name</dt>
        <dd>{draft.name || draft.ticker}</dd>
        <dt>Ticker</dt>
        <dd>{draft.ticker}</dd>
        <dt>Pool tokens</dt>
        <dd>{draft.pooled}</dd>
        <dt>Liquidity</dt>
        <dd>{draft.liquidity}</dd>
        <dt>Supply</dt>
        <dd>{DIRECT_SUPPLY.toLocaleString("en-US")} fixed · no mint</dd>
      </dl>
      {mainnet && <p>Real funds. Review the chain, amounts, and cost before signing.</p>}
      <p>Wallet launcher lands in Plan 2 (Hood) and Plan 3 (pump.fun). Nothing is submitted yet.</p>
      <form method="dialog">
        <button value="close">Edit launch details</button>
      </form>
    </dialog>
  );
});

export default ReviewDialog;
```

- [ ] **Step 3: Rewrite app/page.tsx**

```tsx
"use client";

import { useRef } from "react";
import CharacterStage from "../components/CharacterStage";
import { DraftProvider, useDraft } from "../components/DraftContext";
import LaunchForm from "../components/LaunchForm";
import ReviewDialog from "../components/ReviewDialog";
import StatusBadge from "../components/StatusBadge";
import StudioChat from "../components/StudioChat";
import { CHAINS } from "../lib/chains";

function Studio() {
  const { draft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  return (
    <main>
      <h1>Kentir</h1>
      <StatusBadge />
      <StudioChat />
      <CharacterStage />
      <LaunchForm
        onReview={() => {
          ref.current?.showModal();
        }}
      />
      <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
    </main>
  );
}

export default function Home() {
  return (
    <DraftProvider>
      <Studio />
    </DraftProvider>
  );
}
```

- [ ] **Step 4: Manual verify plus build**

Run: `npm run dev`
Expected: chat fills form fields; chain picker switches; review dialog opens with values; validation blocks empty ticker. Stop server.

Run: `npm run build`
Expected: BUILD passes

Run: `npm test`
Expected: all suites PASS

- [ ] **Step 5: Commit**

```bash
git add components/LaunchForm.tsx components/ReviewDialog.tsx app/page.tsx
git commit -m 'feat: add launch form, review dialog, studio page'
```

### Task 6: Character stage with WebGL fallback

**Files:**
- Create: `lib/webgl.ts`, `components/CharacterStage.tsx`, `public/kentir.png` (placeholder binary, any small PNG)
- Test: `tests/webgl.test.ts`
- Deps: `three`, `@types/three` (dev)

**Interfaces:**
- Consumes: nothing
- Produces: `isWebGLAvailable(): boolean`; `CharacterStage` renders canvas when available else `<img>` fallback

- [ ] **Step 1: Install three**

Run: `npm install three`
Expected: installed

Run: `npm install -D @types/three`
Expected: installed

- [ ] **Step 2: Write tests/webgl.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { isWebGLAvailable } from "../lib/webgl";

describe("webgl probe", () => {
  it("returns false without DOM", () => {
    expect(isWebGLAvailable()).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/webgl.test.ts`
Expected: FAIL with "Cannot find module" for `../lib/webgl`.

- [ ] **Step 4: Write lib/webgl.ts**

```ts
export function isWebGLAvailable(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Write components/CharacterStage.tsx**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { isWebGLAvailable } from "../lib/webgl";

export default function CharacterStage() {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isWebGLAvailable() || !mount.current) return;
    let alive = true;
    let raf = 0;
    let renderer: { dispose: () => void } | null = null;
    let geo: { dispose: () => void } | null = null;
    let mat: { dispose: () => void } | null = null;
    const el = mount.current;
    void import("three")
      .then((THREE) => {
      if (!alive || !el.isConnected) return;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer = r;
      r.setSize(320, 320);
      el.appendChild(r.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 4;
      const g = new THREE.IcosahedronGeometry(1.2, 1);
      const m = new THREE.MeshStandardMaterial({ color: 0xb82535, wireframe: true });
      geo = g;
      mat = m;
      const mesh = new THREE.Mesh(g, m);
      scene.add(mesh);
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const spin = () => {
        if (!alive) return;
        mesh.rotation.y += 0.01;
        r.render(scene, camera);
        raf = requestAnimationFrame(spin);
      };
      spin();
      setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      el.replaceChildren();
      geo?.dispose();
      mat?.dispose();
      renderer?.dispose();
    };
  }, []);

  if (!ready && typeof window !== "undefined" && !isWebGLAvailable()) {
    return <img src="/kentir.png" alt="Kentir character" />;
  }
  return (
    <div aria-label="Character stage">
      <div ref={mount} />
      {!ready && <img src="/kentir.png" alt="Kentir character" />}
    </div>
  );
}
```

- [ ] **Step 6: Add public/kentir.png placeholder**

Any small PNG file saved as `public/kentir.png`. Replace with final art later; v1 only needs the fallback path to exist.

- [ ] **Step 7: Run tests plus build**

Run: `npm test`
Expected: PASS including webgl suite

Run: `npm run build`
Expected: BUILD passes

- [ ] **Step 8: Commit**

```bash
git add lib/webgl.ts components/CharacterStage.tsx public/kentir.png tests/webgl.test.ts package.json package-lock.json
git commit -m 'feat: add 3D character stage with PNG fallback'
```

---

## Later plans (not this file)

- Plan 2: Hood launcher — ERC20 template contract, `lib/launcher-evm.ts`, wallet connect/switch, tx1 deploy + tx2 addLiquidity, resume, testnet verification of 46630 V2 deployment.
- Plan 3: pump.fun launcher — `lib/launcher-solana.ts` via PumpPortal, Phantom/Solflare flow, confirm + resume.
- Plan 4: Showcase — Neon migration, community API routes, `/tokens` page, profile metadata.
