# sCRIT 1-Day Hype Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship sCRIT pilot yang jujur dan bisa launching coin dalam 1 hari di Robinhood Chain 4663 untuk kejar hype, dengan memotong semua yang tidak mungkin selesai (custodian nyata, tax hook on-chain, oracle REE, redemption, audit).

**Architecture:** Reuse 90% kode Artemis legacy. Ubah pairing launcher dari TOKEN/ETH menjadi TOKEN/sCRIT (ERC20-ERC20), deploy token sCRIT fixed-supply + base pool sCRIT/ETH manual, tambah dashboard NAV + PoR manual-feed + attestasi demo EIP-712 via admin panel, rename total Artemis→sCRIT, sembunyikan Solana, gate issuer via DB allowlist.

**Tech Stack:** Next.js 16.3 + React 19 + TypeScript strict + Viem 2.x + solc 0.8.26 + Postgres + Vitest. Tanpa dependensi baru kecuali `ethers` tidak perlu (pakai viem yang ada untuk EIP-712).

## Global Constraints

- Solidity 0.8.26 exact, optimizer runs 200 (sama seperti verifikasi Blockscout lama).
- Chain day-1 hanya 4663 Robinhood Mainnet + 46630 Testnet rehearsal. Solana disembunyikan, bukan dihapus.
- Bahasa code/comments/docs English. Chat user Indonesian. Commit message English only.
- Copy larang total: "100% non-custodial", "no owner roles", "no mint", "0% platform fee / Zero Toll", "Rare earth" untuk Li/U/diamond/Au/Pt, "Backed 1:1" untuk Rail A token, "Verified/Audited" tanpa link, janji reserve/price naik, "Backed" tanpa redemption, count chain palsu.
- Tidak ada tax hook unaudited di mainnet. Swap tax on-chain 0% promo day-1, ditulis eksplisit di UI.
- Cap 2 ETH initial liquidity per pool day-1. Tanpa fiat onramp. Tanpa klaim redeem sCRIT.
- `npm test` harus hijau, `npx tsc --noEmit` nol error, `npm run lint` nol error sebelum deploy.

---

## SPEC KEPUTUSAN FINAL (semua open question brief dijawab, pilih termudah)

### D1. Basket day-1: precious-only 3 aset
- Au 60%, Ag 25%, Pt 15%. Total 100%.
- Alasan: custody + pricing solved, hanya 3 harga manual, UI 3 baris. Lithium/REE/uranium/diamond = kartu grey "not available".
- File config tunggal: `lib/scrit-basket.ts` (baru). Threshold tier dari brief dipakai apa adanya (Standard ≥10k t, Rare 1-10k, Ultra <1k) → Au Rare, Ag Standard, Pt Ultra Rare. Tooltip sumber wajib.

### D2. Accrual: accretive no-mint
- sCRIT fixed 999.000.000 (reuse `DIRECT_SUPPLY`), deploy sekali via bytecode ArtemisToken yang diganti nama. Tidak ada fungsi mint day-1.
- NAV = reserveUSD / 999M. Reserve naik → NAV naik, supply tetap. Jujur + kode nol.
- Keputusan mint-at-NAV ditunda (butuh ReserveManager + audit).

### D3. Tax: 2,5% display, 0% on-chain promo, issuance fee 1% ke treasury
- Alasan safety: tax hook unaudited = risiko sandwich/MEV + router break. Tidak boleh ke mainnet dalam 1 hari.
- Day-1: pool TOKEN/sCRIT tanpa potongan swap. Treasury diisi dari issuance fee 1% dari initial liquidity (transfer manual ke `TREASURY_ADDRESS` saat review, tercatat di `treasury_log`). UI tulis: "Launch promo: 0% swap tax. Target 2.5% (75% reserve / 25% ops) activates after audit."
- Kode hook disiapkan tapi non-aktif (`TAX_BPS=0`, `TAX_ACTIVE=false`).

### D4. Custodian: 1 demo EOA tim, attested via admin EIP-712
- `CUSTODIAN_DEMO_ADDRESS` 1 EOA (ganti via env). Scope allow-all day-1 dengan komentar harus dipecah per-kelas besok. Label UI "demo custodian — first physical audit pending" merah.
- Reserve day-1: 1 struk pembelian nyata kecil (misal 5g emas + invoice pin IPFS) ATAU nol + status merah jujur. Tidak boleh angka fiktif diklaim nyata.
- Attestasi: admin panel password sederhana → sign EIP-712 `{batchId,commodity,massKg,gradeSpec,certificateHash,vaultId,timestamp}` → POST `/api/attestations` → verify via viem → tampil di log + tambah reserve. Reserve HANYA bergerak dari sini.

### D5. Rail A gated
- Hanya issuer di `issuers` allowlist (tim + 3 partner hype) bisa launch day-1. Frontend cek + API cek. Publik lihat + rehearsal testnet bebas.

### D6. Chain EVM-only
- Sembunyikan semua UI Solana (`NEXT_PUBLIC_ENABLE_SOLANA=false`). Kode Solana tidak dihapus (hemat waktu), hanya tidak dirender + tidak bisa dipilih.

### D7. Legal: beta pilot berdokumen
- Halaman statis `/terms`, `/risk`, `/privacy` (isi singkat jujur, bukan placeholder lorem). Modal must-accept sebelum launch mainnet. Cap 2 ETH. Tanpa opini hukum diklaim ada — evidence table tulis "pending" merah.

### D8. KYC: issuer manual, holder bebas
- Form issuer: nama + kontak Telegram + doc link (IPFS via pump-metadata reuse). Review manual via admin approve. Tanpa Sumsub day-1.

### D9. Lithium: DROP day-1
- Tampil sebagai kartu terkunci "Lithium — not available (warehouse + oracle pending)". Tidak masuk hitung NAV.

### D10. Harga: manual team feed + timestamp
- Tabel `prices(commodity, usdPerKg, source, updatedAt)`. Admin update tiap 6 jam. UI label per baris "manual team feed · updatedxh ago · staleness 24h". Stale >24h → badge kuning + NAV badge kuning.

### D11. Dealer/AML: tunda + batasi
- Cap kecil + ToS larang US/sanctioned + log creator. Evidence table merah "dealer registration pending counsel".

### D12. Redemption: NONE (opsi C) + copy jujur
- Tidak ada tombol redeem sCRIT. Indikator premium/discount live wajib di dashboard. Copy: "sCRIT is not pegged. Issuer maintains a pilot reserve; market price may trade at significant premium or discount." Rail B: 1 lot diamond demo view-only (GIA contoh fiktif dilabel contoh), tombol request → form Telegram, tidak ada burn day-1.

---

## FILE MAP (buat/ubah)

Buat:
- `lib/scrit.ts` — konstanta sCRIT (alamat token, treasury, base pool, tax promo, cap, link legal)
- `lib/scrit-basket.ts` — basket 3 aset + tier + bobot + grade
- `lib/nav.ts` — hitung NAV/reserve/premium dari holdings + prices + supply (pure, full test)
- `lib/attestation.ts` — EIP-712 domain/types/verify (viem), pure
- `app/api/prices/route.ts`, `app/api/attestations/route.ts`, `app/api/treasury/route.ts`, `app/api/issuers/route.ts`
- `app/index-scrit/page.tsx` — dashboard Index (atau ganti `app/page.tsx` section 1)
- `app/proof/page.tsx`, `app/legal/[doc]/page.tsx`, `app/admin/page.tsx`
- `contracts/sCRITToken.sol`, `contracts/sCRITLauncher.sol` (copy Artemis + rename + ganti ETH→ERC20)
- `migrations/0007_scrit_pilot.sql`
- `tests/nav.test.ts`, `tests/attestation.test.ts`, `tests/scrit-launcher.test.ts`

Ubah:
- `lib/chains.ts` — tambah sCRIT address, sembunyikan Solana via flag
- `lib/launcher-evm.ts` — tambah `launchTokenScrit()` ERC20-ERC20 + sCRIT approve flow
- `lib/draft.ts` — lock pair sCRIT, cap 2 ETH, validasi issuer allowlist hint
- `components/*` — rename massal + hapus fake terminal/duplikat/placeholder (daftar di tiap task)
- `app/layout.tsx` — title/deskripsi sCRIT
- `scripts/compile-token.mjs` — compile 2 kontrak baru juga

---

### Task 1: Konstanta + basket + NAV pure + test hijau

**Files:**
- Create: `lib/scrit.ts`, `lib/scrit-basket.ts`, `lib/nav.ts`
- Test: `tests/nav.test.ts`

**Interfaces:**
- Consumes: tidak ada (pure baru)
- Produces: `SCRIT_SUPPLY=999000000n`, `TAX_BPS=0`, `TAX_ACTIVE=false`, `ISSUANCE_FEE_BPS=100`, `MAX_ETH_PER_POOL=2n*10n**18n`, `BASKET=[{symbol:'Au',weightBps:6000,tier:'Rare'},...]`, `calcNav(holdingsKg: Record<string,number>, pricesUsdPerKg: Record<string,number>, supply: bigint): {reserveUsd:number, navUsd:number}`, `calcPremium(marketUsd:number, navUsd:number): number`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { calcNav, calcPremium } from "../lib/nav";
describe("nav", () => {
  it("computes reserve and nav", () => {
    const r = calcNav({ Au: 0.005, Ag: 0.2, Pt: 0.002 }, { Au: 85000, Ag: 1100, Pt: 95000 }, 999000000n);
    expect(r.reserveUsd).toBeCloseTo(0.005*85000 + 0.2*1100 + 0.002*95000, 6);
    expect(r.navUsd).toBeCloseTo(r.reserveUsd / 999000000, 10);
  });
  it("premium positive when market above nav", () => {
    expect(calcPremium(1.1, 1)).toBeCloseTo(0.1, 10);
  });
  it("premium negative when market below nav", () => {
    expect(calcPremium(0.9, 1)).toBeCloseTo(-0.1, 10);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run tests/nav.test.ts`
Expected: FAIL with "Cannot find module '../lib/nav'"

- [ ] **Step 3: Minimal implementation `lib/nav.ts`**

```ts
export function calcNav(holdingsKg: Record<string, number>, pricesUsdPerKg: Record<string, number>, supply: bigint): { reserveUsd: number; navUsd: number } {
  let reserveUsd = 0;
  for (const k of Object.keys(holdingsKg)) reserveUsd += (holdingsKg[k] ?? 0) * (pricesUsdPerKg[k] ?? 0);
  const navUsd = supply === 0n ? 0 : reserveUsd / Number(supply);
  return { reserveUsd, navUsd };
}
export function calcPremium(marketUsd: number, navUsd: number): number {
  if (navUsd === 0) return 0;
  return marketUsd / navUsd - 1;
}
```

`lib/scrit.ts`:
```ts
export const SCRIT_SUPPLY = 999000000n;
export const TAX_BPS = 0;
export const TAX_ACTIVE = false;
export const TAX_TARGET_BPS = 250;
export const ISSUANCE_FEE_BPS = 100;
export const MAX_ETH_PER_POOL = 2n * 10n ** 18n;
export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const SCRIT_ADDRESS = (process.env.NEXT_PUBLIC_SCRIT ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
```

`lib/scrit-basket.ts`:
```ts
export type BasketRow = { symbol: "Au" | "Ag" | "Pt"; weightBps: number; tier: "Rare" | "Standard" | "Ultra Rare"; grade: string };
export const BASKET: BasketRow[] = [
  { symbol: "Au", weightBps: 6000, tier: "Rare", grade: "LBMA 999.9" },
  { symbol: "Ag", weightBps: 2500, tier: "Standard", grade: "999 bars" },
  { symbol: "Pt", weightBps: 1500, tier: "Ultra Rare", grade: "9995 sponge" },
];
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run tests/nav.test.ts`
Expected: PASS 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/scrit.ts lib/scrit-basket.ts lib/nav.ts tests/nav.test.ts
git commit -m "feat: add scrit constants basket nav"
```

### Task 2: Attestation EIP-712 pure + verify test

**Files:**
- Create: `lib/attestation.ts`
- Test: `tests/attestation.test.ts`

**Interfaces:**
- Consumes: viem (sudah ada)
- Produces: `ATTEST_TYPES`, `attestationDomain(chainId:number, contract:string)`, `verifyAttestation(params): Promise<boolean>` — verify via `viem.verifyTypedData`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ATTEST_TYPES, attestationDomain } from "../lib/attestation";
describe("attestation", () => {
  it("domain and types shape", () => {
    expect(ATTEST_TYPES.Attestation.map((f) => f.name)).toEqual(["batchId","commodity","massKg","gradeSpec","certificateHash","vaultId","timestamp"]);
    expect(attestationDomain(4663, "0x0000000000000000000000000000000000000001").name).toBe("sCRIT-Reserve");
  });
  it("sign then verify roundtrip", async () => {
    const { signAttestation } = await import("../lib/attestation");
    const pk = generatePrivateKey();
    const acc = privateKeyToAccount(pk);
    const msg = { batchId: "B-001", commodity: "Au", massKg: "0.005", gradeSpec: "LBMA 999.9", certificateHash: "ipfs://x", vaultId: "VAULT-AU-1", timestamp: 1720000000n };
    const sig = await signAttestation({ chainId: 4663, verifying: "0x0000000000000000000000000000000000000001", message: msg, privateKey: pk });
    const { verifyAttestation } = await import("../lib/attestation");
    const ok = await verifyAttestation({ chainId: 4663, verifying: "0x0000000000000000000000000000000000000001", message: msg, signature: sig, expected: acc.address });
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run tests/attestation.test.ts`
Expected: FAIL cannot find module

- [ ] **Step 3: Implement `lib/attestation.ts`**

```ts
import { verifyTypedData, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
export type AttestationMsg = { batchId: string; commodity: string; massKg: string; gradeSpec: string; certificateHash: string; vaultId: string; timestamp: bigint };
export const ATTEST_TYPES = { Attestation: [
  { name: "batchId", type: "string" }, { name: "commodity", type: "string" },
  { name: "massKg", type: "string" }, { name: "gradeSpec", type: "string" },
  { name: "certificateHash", type: "string" }, { name: "vaultId", type: "string" },
  { name: "timestamp", type: "uint256" },
] } as const;
export function attestationDomain(chainId: number, verifying: string) {
  return { name: "sCRIT-Reserve", version: "1", chainId, verifyingContract: verifying as Address };
}
export async function signAttestation(a: { chainId: number; verifying: string; message: AttestationMsg; privateKey: Hex }) {
  const acc = privateKeyToAccount(a.privateKey);
  return acc.signTypedData({ domain: attestationDomain(a.chainId, a.verifying), types: ATTEST_TYPES, primaryType: "Attestation", message: a.message as unknown as Record<string, unknown> });
}
export async function verifyAttestation(a: { chainId: number; verifying: string; message: AttestationMsg; signature: Hex; expected: string }) {
  return verifyTypedData({ address: a.expected as Address, domain: attestationDomain(a.chainId, a.verifying), types: ATTEST_TYPES, primaryType: "Attestation", message: a.message as unknown as Record<string, unknown>, signature: a.signature });
}
```

- [ ] **Step 4: Run pass**

Run: `npx vitest run tests/attestation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/attestation.ts tests/attestation.test.ts
git commit -m "feat: add eip712 attestation verify"
```

### Task 3: Kontrak sCRITToken + sCRITLauncher (ERC20-ERC20) + compile + artifact test

**Files:**
- Create: `contracts/sCRITToken.sol`, `contracts/sCRITLauncher.sol`
- Modify: `scripts/compile-token.mjs`
- Test: `tests/scrit-launcher.test.ts` (pure validasi param, bukan chain)

**Interfaces:**
- Consumes: `TOKEN_BYTECODE` pattern lama
- Produces: `SCRIT_ABI/SCRIT_BYTECODE`, `SCRIT_LAUNCHER_ABI`, fungsi `launchTokenScrit` di Task 4

`sCRITToken.sol` = copy ArtemisToken ganti nama contract + tambah comment promo (tidak ada mint day-1):
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
contract sCRITToken { /* sama persis body ArtemisToken */ }
```
Salin body 1:1, hanya ganti nama agar verifikasi bersih.

`sCRITLauncher.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "./sCRITToken.sol";
interface IV2Router02 {
  function addLiquidity(address a, address b, uint ad, uint bd, uint am, uint bm, address to, uint dl) external returns (uint, uint, uint);
}
contract sCRITLauncher {
  address public immutable scrit;
  address public immutable router;
  event Launched(address indexed token, address indexed creator, uint pooledTokens, uint scritAdded, uint liquidity);
  constructor(address s, address r) { require(s != address(0) && r != address(0)); scrit = s; router = r; }
  function launch(string memory n, string memory s, uint supply, uint pooled, uint scritAmt, uint scritMin, uint deadline) external returns (address token, uint liq) {
    require(pooled > 0 && pooled <= supply, "pooled");
    require(scritAmt > 0, "scrit");
    require(deadline > block.timestamp, "deadline");
    require(IERC20(scansrit).transferFrom(msg.sender, address(this), scritAmt), "pull");
    sCRITToken t = new sCRITToken(n, s, supply);
    token = address(t);
    require(t.approve(router, pooled), "approveT");
    require(IERC20(scansrit).approve(router, scritAmt), "approveS");
    (,, liq) = IV2Router02(router).addLiquidity(token, scrit, pooled, scritAmt, pooled, scritMin, msg.sender, deadline);
    uint bal = t.balanceOf(address(this));
    if (bal > 0) require(t.transfer(msg.sender, bal), "payout");
    emit Launched(token, msg.sender, pooled, scritAmt, liq);
  }
}
interface IERC20 { function transferFrom(address,address,uint) external returns (bool); function approve(address,uint) external returns (bool); }
```
Catatan: `scansrit` placeholder di atas harus nama variabel `scrit` — tulis benar saat implementasi, jangan copy buta.

- [ ] **Step 1: Test param validation**

```ts
import { describe, expect, it } from "vitest";
describe("scrit launcher params", () => {
  it("rejects pooled over supply", () => {
    const supply = 1000n, pooled = 1001n;
    expect(pooled > 0n && pooled <= supply).toBe(false);
  });
  it("artifacts exist after compile", async () => {
    const m = await import("../lib/scrit-artifact");
    expect(m.SCRIT_BYTECODE.startsWith("0x")).toBe(true);
  });
});
```

- [ ] **Step 2: Run fail** `npx vitest run tests/scrit-launcher.test.ts` → cannot find scrit-artifact
- [ ] **Step 3: Buat 2 sol + update compile script untuk emit `lib/scrit-artifact.ts` (ABI+BYTECODE sCRIT + launcher), jalankan `node scripts/compile-token.mjs`**
- [ ] **Step 4: Run pass**
- [ ] **Step 5: Commit** `git add contracts/sCRIT* lib/scrit-artifact.ts scripts/compile-token.mjs tests/scrit-launcher.test.ts` + `git commit -m "feat: add scrit token launcher erc20 pair"`

Deploy manual (di luar test, oleh manusia, 30 menit): deploy sCRITToken 999M ke 4663 → catat alamat → deploy sCRITLauncher(scrit, router 0x89e5...) → verify Blockscout standard-json → tambah base liquidity sCRIT/ETH kecil via router langsung → isi env `NEXT_PUBLIC_SCRIT`, `NEXT_PUBLIC_SCRIT_LAUNCHER`, `NEXT_PUBLIC_TREASURY`.

### Task 4: lib EVM untuk sCRIT (approve sCRIT + launch + estimasi)

**Files:**
- Modify: `lib/launcher-evm.ts` (tambah, jangan hapus legacy)
- Test: tambah case di `tests/launcher-evm.test.ts` atau file baru `tests/scrit-evm.test.ts`

Fungsi baru:
```ts
export async function launchTokenScrit(args: { chainId: 4663|46630; account: Address; name: string; ticker: string; supply: bigint; pooled: bigint; scritAmount: bigint; slippageBps?: number }): Promise<{ hash: `0x${string}`; token: Address }>
```
Langkah: cek cap, `calcScritMin`, `ensureChain`, approve sCRIT ke launcher bila allowance kurang, `writeContract launcher.launch`, tunggu receipt, `decodeLaunchedToken` reuse dengan alamat launcher baru.

- [ ] **Step 1: test allowance math + scritMin**
- [ ] **Step 2: fail**
- [ ] **Step 3: implement**
- [ ] **Step 4: pass** `npx vitest run tests/scrit-evm.test.ts`
- [ ] **Step 5: commit**

### Task 5: DB + API pilot (issuers, prices, attestations, treasury)

**Files:**
- Create: `migrations/0007_scrit_pilot.sql`, `app/api/prices/route.ts`, `app/api/attestations/route.ts`, `app/api/treasury/route.ts`, `app/api/issuers/route.ts`
- Test: `tests/scrit-api.test.ts` (pure normalize + sql string check, tanpa DB live)

SQL:
```sql
create table if not exists issuers (wallet text primary key, name text, contact text, approved boolean default false, created_at timestamptz default now());
create table if not exists prices (commodity text primary key, usd_per_kg double precision not null, source text not null, updated_at timestamptz default now());
create table if not exists attestations (batch_id text primary key, commodity text not null, mass_kg text not null, grade_spec text, certificate_hash text, vault_id text, custodian text not null, signature text not null, created_at timestamptz default now());
create table if not exists treasury_log (id bigserial primary key, kind text not null, amount_text text not null, tx_hash text, note text, created_at timestamptz default now());
```

API:
- `GET /api/prices` → list + staleness flag (>24h). `POST` dengan header `x-admin-key` == `ADMIN_KEY` env untuk update.
- `POST /api/attestations` admin-key → verify EIP-712 via `verifyAttestation` lawan `CUSTODIAN_DEMO_ADDRESS` → insert. `GET` list untuk dashboard log.
- `POST /api/treasury` admin-key atau issuance internal → insert log. `GET` total unspent.
- `GET /api/issuers?wallet=` → approved bool. `POST` admin-key approve.

- [ ] **Step 1-5 standar:** test normalize wallet + staleness pure, migrasi via `psql "$DATABASE_URL" -f migrations/0007_scrit_pilot.sql`, commit.

### Task 6: Rename massal + hapus pelanggaran copy (frontend)

**Files Modify (wajib semua):**
- `app/layout.tsx`: title `sCRIT — Commodity-Backed Index Launchpad`, description tanpa non-custodial/zero-fee
- `components/ArrivalPreloader.tsx:85`: hapus `FIXED 999M SUPPLY · ZERO TAXES` → `sCRIT PILOT · TESTED RESERVE LOGIC`
- `components/HeroSection.tsx`: hapus `NON-CUSTODIAL/ZERO TOLL/fixed 999M/{CHAINS.length}`, ganti hero copy: "Launch tokens paired with sCRIT — pilot index with attested precious reserve. Swap tax promo 0%. sCRIT not pegged."
- `components/FeatureSection.tsx`: 6 kartu baru `sCRIT INDEX / sCRIT/ETH BASE / TOKEN/sCRIT POOLS / ATTESTED RESERVE / MANUAL PRICE FEED / GATED LAUNCH`, hapus duplikasi `[...features,...features]` → single list (hapus spread ganda)
- `components/StepsSection.tsx`: hapus seluruh `getStageLogs/packetCount/latencyJitter/autoAdvance/UPLINK/ARTEMIS_KERNEL_V1/shell artemis@`, ganti dengan 4 langkah nyata: Draft → Approve sCRIT → Launch → Verify. Hapus marquee `NO OWNER ROLES · 100% NON-CUSTODIAL`.
- `components/WorksSection.tsx`, `ComparisonSection.tsx`, `TransparencySection.tsx`, `TechnologySection.tsx`, `AudiencesSection.tsx`, `ExecutionSection.tsx`, `IntroSection.tsx`, `Footer.tsx`, `Navbar.tsx`, `NavigationDialog.tsx`, `StudioChat.tsx`, `StudioSection.tsx`, `LaunchForm.tsx`: replace `Artemis→sCRIT`, persona → Issuers/Investors/Custodians, footer x.com/github.com → link legal + explorer router, hapus `Zero Toll/No Owner/Non-custodial`.
- `lib/receipts.ts:13` key → `scrit.receipts.v1` (migrasi baca dua key seminggu, tulis key baru)
- `public/assets/logo.webp/icon.png` tetap dulu (ganti file besok), alt text ganti sCRIT hari ini.

Cara cepat: `rg -l Artemis` lalu sed per file + review manual. Test: `rg -i "artemis|ARTEMIS_KERNEL|Zero Toll|Non-Custodial|No Owner|999,000,000|999M" app components lib | wc -l` harus 0 untuk marketing (biarkan di docs lama + test fungsional bila perlu dengan komentar).

- [ ] **Step 1:** test grep script sebagai `tests/copy-guard.test.ts` yang assert file daftar bersih tidak mengandung string larang
- [ ] **Step 2-5 standar**, commit `chore: rename artemis scrit remove banned copy`

### Task 7: Dashboard Index + Proof of Reserve + premium live

**Files Create:** `app/index-scrit/page.tsx` (atau section di `app/page.tsx`), `app/proof/page.tsx`, `components/NavHero.tsx`, `components/PremiumBadge.tsx`, `components/ReserveTable.tsx`, `components/AttestationLog.tsx`
- Ambil `GET /api/prices` + `GET /api/attestations` + holdings teraplikasi dari attestasi (sum massKg per commodity) → `calcNav` → tampil NAV USD primer, market sekunder (input manual admin/pool price via `NEXT_PUBLIC_SCRIT_MARKET` sementara + tombol refresh dari base pool reserves bila sempat, bila tidak sempat input manual dilabel manual).
- `PremiumBadge` hijau/merah + tulisan jujur bila C: "not pegged".
- `ReserveTable` per baris: holdings, harga, sumber, updated ago, stale flag.
- `AttestationLog` dari API.
- Kartu grey Li/REE/U/diamond "not available".
- Chart komposisi per 3 kelas? Day-1 hanya precious → 3 bar sederhana (div width %, tanpa lib chart baru).

Test: komponen pure via vitest + `calcNav` reuse. Commit `feat: add scrit index proof`.

### Task 8: Launch form lock sCRIT + disclosure + gated issuer + cap

**Files Modify:** `components/LaunchForm.tsx`, `components/ReviewDialog.tsx`, `lib/draft.ts`
- Pair label tetap, hapus pilihan ETH. Tampilkan `sCRIT address` + base pool link.
- Tambah checkbox disclosure: "Rail A token is not a claim on any commodity. Only sCRIT relates to aggregate basket. sCRIT not pegged, no redemption." Wajib centang.
- Tambah promo box: "0% swap tax promo. Target 2.5% after audit. 1% issuance fee to treasury."
- Cap: `liquidity` sCRIT amount? Day-1 pool TOKEN/sCRIT tanpa ETH → cap dalam sCRIT senilai ~2 ETH (hitung via market price, tolak bila lebih).
- Issuer gate: input wallet → fetch `/api/issuers?wallet=` → bila false tampil "gated pilot — request via Telegram {link}" + disable Review mainnet (testnet tetap bisa).
- ReviewDialog EVM path baru: approve sCRIT → `launchTokenScrit` → issuance fee transfer ke treasury + `POST /api/treasury` log → success modal dengan link token + pool + treasury tx.

Test: `validateDraft` cap + disclosure flag. Commit.

### Task 9: Legal + admin + testnet badge + hide Solana

**Files Create:** `app/legal/[doc]/page.tsx` (terms/risk/privacy isi 300-500 kata jujur, bukan lorem), `app/admin/page.tsx` (password `ADMIN_KEY` via header, form update price, form attestasi sign via viem di browser dengan private key custodian demo ditempel manual — tidak disimpan server, form approve issuer, tombol seed prices)
**Files Modify:** `components/TopbarWallet.tsx`, `WalletModal.tsx`, `ReviewDialog.tsx`, `StudioChat.tsx`, `ExecutionSection.tsx`, `lib/chains.ts` — bungkus semua cabang `solana` dengan `if (process.env.NEXT_PUBLIC_ENABLE_SOLANA === "true")`, default false. Badge `Testnet` kuning vs `Mainnet Pilot` merah di Navbar + Studio + Review.
- Modal must-accept legal sebelum mainnet launch (localStorage `scrit.legal.v1`).

Test: flag Solana off → `getChain('solana-mainnet')` tetap ada tapi UI tidak render (test render skip). Commit.

### Task 10: Verifikasi akhir + deploy checklist + hype kit

- [ ] `npx tsc --noEmit` nol error
- [ ] `npm run lint` nol error
- [ ] `npm test` hijau
- [ ] `npm run build` sukses
- [ ] `rg banned copy` nol
- [ ] Migrasi 0007 teraplikasi di Supabase
- [ ] Env prod terisi: `NEXT_PUBLIC_SCRIT, NEXT_PUBLIC_SCRIT_LAUNCHER, NEXT_PUBLIC_TREASURY, NEXT_PUBLIC_ENABLE_SOLANA=false, ADMIN_KEY` (server only), `DATABASE_URL`
- [ ] Deploy Vercel + smoke: buka `/`, `/index-scrit`, `/proof`, `/tokens`, launch 1 pool testnet 46630, launch 3 pool mainnet gated (tim + 2 partner), update 3 harga, 1 attestasi demo, cek NAV + premium tampil
- [ ] Hype kit: 3 tweet draft + 1 thread + logo sCRIT sementara (teks, bukan gambar baru) + halaman `/launch` CTA besar "Launch paired with sCRIT — 3 slots today"

Commit final `release: scrit 1day pilot`.

---

## RISIKO DISADARI + MITIGASI 1 HARI

- Tax hook tanpa audit → TIDAK DEPLOY. Mitigasi promo 0% jujur.
- Custodian demo → label merah + audit pending, treasury cap kecil.
- Oracle manual → staleness badge + update 6 jam.
- Tanpa opini hukum → cap + gated + ToS/Risk must-accept + evidence merah.
- Tanpa redemption → copy not-pegged + premium live.
- Solana disembunyikan → kurangi surface 50%.

## YANG SENGAJA TIDAK DIKERJAKAN HARI INI (tulis di Transparency)

TradingTaxHook on-chain, ReserveManager mint, CustodianRegistry scoped per-kelas, PriceOracleAdapter Chainlink, RedemptionManager/APRegistry, Rail B order book + burn, KYC Sumsub, indexer The Graph, cron NAV, audit kontrak/fisik, logo baru, USDC pool.
