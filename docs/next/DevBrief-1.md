# DevBrief — Artemis ZK Verified Creator

**Proyek:** Artemis — Autonomous Non-Custodial Token Launchpad
**Fitur:** ZK Verified Creator (zkTLS proof kepemilikan akun X/Twitter, terikat ke wallet creator)
**Versi brief:** v1.0 · 23 Sep 2026
**Status:** Draft untuk developer & desainer

---

## 0. TL;DR

Tambahkan fitur **"ZK Verified Creator"**: creator token membuktikan dengan zero-knowledge TLS (zkTLS, via Reclaim Protocol) bahwa ia benar-benar mengontrol akun X/Twitter yang dicantumkan di launch, **tanpa OAuth, tanpa password, tanpa memberi Artemis akses ke akunnya**. Proof diikat ke alamat wallet deployer. Hasilnya: badge **ZK VERIFIED** di Launch Studio, halaman token, dan Showcase — plus tombol "Inspect Proof" agar siapa pun bisa memeriksa bukti mentahnya.

Lalu tambahkan **section landing page "Zero-Knowledge Verification"** yang menjelaskan fitur ini secara jujur: apa yang dibuktikan, bagaimana, dan apa yang **tidak** dibuktikan.

> **Aturan utama:** section ZK dan semua copy "ZK" hanya boleh live **setelah** fitur benar-benar berfungsi di production. Tidak ada klaim ZK kosmetik.

---

## 1. Latar Belakang & Masalah

- Di launchpad memecoin, field "X / Twitter" bisa diisi siapa saja. Scammer sering mencantumkan akun terkenal di token palsu.
- Artemis sudah kuat di sisi *contract* (fixed supply, no mint, no owner). Yang belum terverifikasi adalah **identitas sosial creator**.
- zkTLS memungkinkan user membuktikan data dari website (mis. "saya login sebagai @handle di x.com") tanpa membocorkan cookie/session/password ke pihak ketiga.

**Kenapa cocok dengan brand Artemis:** konsisten dengan prinsip "client sovereign" — Artemis tidak pernah memegang kredensial user, sama seperti tidak pernah memegang private key.

---

## 2. Tujuan & Non-Tujuan

### Tujuan
1. Creator bisa membuktikan kepemilikan akun X dan mengikatnya ke wallet deployer.
2. Buyer bisa melihat badge dan memeriksa proof mentah.
3. Section landing page yang menjelaskan fitur dengan jujur.
4. Artemis tetap tidak menyimpan kredensial atau data pribadi di luar handle publik.

### Non-Tujuan (v1)
- Tidak membuktikan bahwa token "aman", "tidak rug", atau "legit".
- Tidak ada KYC / identitas dunia nyata.
- Tidak ada verifier onchain di v1 (lihat §12 Roadmap).
- Tidak mewajibkan verifikasi untuk launch — opsional.

---

## 3. Apa yang Dibuktikan (dan Tidak)

| Dibuktikan | TIDAK dibuktikan |
|---|---|
| Pemilik session x.com saat verifikasi adalah akun **@handle** | Bahwa orang di balik akun itu jujur |
| Proof dibuat untuk **wallet 0x…** tertentu (context terikat, tamper-resistant) | Bahwa token tidak akan di-dump oleh creator |
| Wallet itu adalah **deployer** token yang ditampilkan | Bahwa akun X tidak akan dijual/diretas nanti |
| Waktu verifikasi (timestamp) | Nilai, volume, atau likuiditas token |

**Model kepercayaan (wajib disebut di UI & docs):** Reclaim menggunakan attestor/witness untuk menandatangani claim TLS, dengan TEE attestation. Ini bukan "trustless murni" — ada asumsi kepercayaan pada attestor network. Tulis ini secara terbuka di section "What We Do Not Hide".

---

## 4. User Flow

### 4.1 Creator (setelah atau sebelum launch)

```
[Launch Studio / Token Page]
   │  klik "Verify X with ZK"
   ▼
[1] Connect wallet (jika belum)
   ▼
[2] Sign pesan (SIWE-style) → membuktikan kepemilikan wallet
   ▼
[3] Server membuat Reclaim proof request
     context.address = wallet
     context.message = { token, chainId, nonce }
   ▼
[4] Reclaim flow (extension / QR / App Clip) → user login x.com di sisi Reclaim
   ▼
[5] Proof dikirim ke /api/zk/callback → diverifikasi server
   ▼
[6] Badge ZK VERIFIED muncul + receipt proof
```

### 4.2 Buyer / Pengunjung

```
[Showcase / Token Page] → lihat badge ZK VERIFIED @handle
   ▼ klik "Inspect Proof"
[Proof Drawer] → handle, wallet, token, timestamp, attestor, sessionId,
                 status verifikasi ulang, tombol "Download proof.json"
```

### 4.3 Kasus khusus
- **Handle di proof ≠ handle yang diisi di form** → gagal, tampilkan pesan jelas, tawarkan update field X ke handle yang terbukti.
- **Wallet bukan deployer token** → gagal (jika verifikasi untuk token tertentu).
- **User batal di tengah flow** → state kembali ke `idle`, tidak ada data tersimpan.
- **Proof expired / replay** → ditolak (lihat §7).
- **Satu handle dipakai banyak wallet** → diperbolehkan tetapi tampilkan "Also verified on N other tokens" di drawer (transparansi, membantu mendeteksi pola spam).

---

## 5. Arsitektur Teknis

### 5.1 Stack
- Frontend: stack Artemis saat ini (Vercel). Asumsi Next.js — sesuaikan jika berbeda.
- SDK: `@reclaimprotocol/js-sdk` (frontend + backend).
- Kredensial: `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID_X` dari Reclaim Developer Portal. **APP_SECRET hanya di server.**
- Provider: pilih provider X/Twitter username di Reclaim Developer Portal. Jangan hardcode ID dari contoh docs.
- Penyimpanan: Postgres (Vercel Postgres / Neon / Supabase) atau KV untuk session. IndexedDB lokal **tidak cukup** karena badge harus publik.

> **Catatan transparansi:** saat ini copy Artemis menyebut "stateless API proxy". Fitur ini menambah penyimpanan data publik (handle, wallet, proof). Update copy di "What We Do Not Hide" (lihat §9.4).

### 5.2 Endpoint

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/zk/nonce` | Buat nonce untuk sign-in wallet |
| `POST` | `/api/zk/init` | Verifikasi signature wallet, buat Reclaim request, simpan `sessionId`, kembalikan config JSON |
| `POST` | `/api/zk/callback` | Terima proof dari Reclaim, verifikasi, simpan hasil |
| `GET`  | `/api/zk/status?session=` | Polling status untuk frontend |
| `GET`  | `/api/zk/token/:chainId/:address` | Data badge publik untuk token |
| `GET`  | `/api/zk/proof/:id` | Proof mentah (JSON) untuk inspeksi/unduh |

### 5.3 Pseudocode server (konfirmasi nama method & opsi dengan docs Reclaim terbaru)

```ts
// POST /api/zk/init
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export async function init(req) {
  const { wallet, signature, nonce, token, chainId } = req.body;

  assertNonceValid(nonce);                          // belum dipakai, < 5 menit
  assertSignature(wallet, signature, nonce);        // SIWE / EIP-191 (EVM) atau ed25519 (Solana)
  if (token) await assertDeployer(wallet, token, chainId); // cek tx deploy / receipt

  const request = await ReclaimProofRequest.init(
    process.env.RECLAIM_APP_ID,
    process.env.RECLAIM_APP_SECRET,
    process.env.RECLAIM_PROVIDER_ID_X,
  );

  request.setContext(
    wallet,
    JSON.stringify({ app: 'artemis', token, chainId, nonce }),
  );
  request.setAppCallbackUrl(`${BASE_URL}/api/zk/callback`, true);

  const sessionId = request.getSessionId();
  await db.zkSessions.insert({
    sessionId, wallet, token, chainId, nonce,
    status: 'pending', createdAt: now(),
  });

  return { config: request.toJsonString(), sessionId };
}
```

```ts
// POST /api/zk/callback
import { verifyProof } from '@reclaimprotocol/js-sdk';

export async function callback(req) {
  const proof = parseProof(req.body);
  const session = await db.zkSessions.get(proof.sessionId);

  // 1. Session harus kita terbitkan & belum dipakai (anti-replay)
  if (!session || session.status !== 'pending') return reject('unknown_or_used_session');

  // 2. Verifikasi kriptografis (signature attestor + TEE attestation WAJIB aktif)
  const ok = await verifyProof(proof /*, opsi TEE sesuai docs */);
  if (!ok) return reject('invalid_proof');

  // 3. Freshness
  if (now() - proof.claimData.timestampS * 1000 > 10 * 60_000) return reject('stale_proof');

  // 4. Context harus cocok dengan session
  const ctx = JSON.parse(proof.claimData.context);
  if (lower(ctx.contextAddress) !== lower(session.wallet)) return reject('wallet_mismatch');
  if (ctx.contextMessage?.nonce !== session.nonce) return reject('nonce_mismatch');

  // 5. Ambil handle dari parameter yang terbukti
  const handle = normalizeHandle(extractHandle(proof));

  // 6. Simpan (sessionId unique index)
  await db.tx(async (t) => {
    await t.zkSessions.update(session.sessionId, { status: 'verified' });
    await t.zkVerifications.insert({
      handle, wallet: session.wallet, token: session.token, chainId: session.chainId,
      sessionId: session.sessionId, proofJson: proof, verifiedAt: now(),
    });
  });
}
```

### 5.4 Frontend

```ts
const { config, sessionId } = await post('/api/zk/init', payload);
const request = await ReclaimProofRequest.fromJsonString(config);
await request.triggerReclaimFlow();   // extension → QR → App Clip otomatis
// Jangan percaya onSuccess di client sebagai bukti final.
// Poll /api/zk/status?session=… sampai 'verified' atau 'failed'.
```

### 5.5 Data model

```sql
CREATE TABLE zk_sessions (
  session_id   TEXT PRIMARY KEY,
  wallet       TEXT NOT NULL,
  token        TEXT,
  chain_id     INTEGER,
  nonce        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL CHECK (status IN ('pending','verified','failed','expired')),
  fail_reason  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE zk_verifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle       TEXT NOT NULL,
  wallet       TEXT NOT NULL,
  token        TEXT,
  chain_id     INTEGER,
  session_id   TEXT NOT NULL UNIQUE REFERENCES zk_sessions(session_id),
  proof_json   JSONB NOT NULL,
  verified_at  TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ
);
CREATE INDEX ON zk_verifications (chain_id, token);
CREATE INDEX ON zk_verifications (handle);
```

---

## 6. Dukungan Chain

| Rail | Wallet proof | Deployer check |
|---|---|---|
| Robinhood Chain (EVM) | EIP-191 / SIWE via MetaMask | `from` pada tx deploy launcher, atau event launcher |
| Solana (pump.fun) | `signMessage` ed25519 via Phantom/Solflare | Creator field di metadata/tx create pump.fun |

Testnet (Robinhood 46630, Solana Devnet) harus didukung penuh untuk rehearsal, dengan badge bertanda **TESTNET**.

---

## 7. Keamanan (wajib)

1. **APP_SECRET hanya server-side.** Frontend hanya menerima config hasil `toJsonString()`.
2. **Anti-replay:** tolak `sessionId` yang tidak diterbitkan Artemis; unique index + status `pending → verified` dalam satu transaksi.
3. **TEE attestation wajib dicek** saat `verifyProof`.
4. **Freshness:** tolak proof dengan `timestampS` lebih tua dari 10 menit.
5. **Kepemilikan wallet:** signature nonce sebelum init; nonce sekali pakai, TTL 5 menit.
6. **Context binding:** alamat di context proof harus sama dengan wallet session.
7. **Badge hanya dari server:** jangan pernah render badge dari state client/IndexedDB.
8. **Rate limit** `/api/zk/init` per IP & per wallet (mis. 5/jam).
9. **Revocation:** kolom `revoked_at`; admin bisa mencabut badge jika ada laporan (tampilkan "REVOKED" + alasan, bukan menghapus diam-diam).
10. **Privasi:** simpan hanya handle publik + proof. Jangan simpan email, cookie, atau data lain.

---

## 8. Desain

Ikuti bahasa visual Artemis yang sudah ada: label mono uppercase dengan pola `NN // LABEL`, tag status di kanan atas card, angka besar tebal, garis tipis, copy teknis pendek. Gunakan token warna dan font yang sudah ada di codebase — **jangan buat palet baru**. Satu aksen tambahan boleh untuk status verified (gunakan warna aksen utama Artemis).

### 8.1 Posisi section di landing page

Urutan yang disarankan:

```
Hero → About → Features carousel → Studio → How it works → Pipeline
→ Mechanics → Builders → Custodial vs Artemis
→ ★ ZERO-KNOWLEDGE VERIFICATION (baru)
→ Two Launch Rails → What We Do Not Hide → Final CTA
```

Alasan: setelah perbandingan "Custodial vs Artemis", section ZK menjawab pertanyaan berikutnya: *"oke kontraknya aman, tapi siapa creatornya?"*. Tambahkan juga link `ZK Verify` di footer {PROTOCOL}.

Anchor: `#zk`

### 8.2 Wireframe section (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 07 // ZERO-KNOWLEDGE VERIFICATION                     zkTLS · LIVE   │
│                                                                      │
│  Prove who launched it.                                              │
│  Reveal nothing else.                                                │
│                                                                      │
│  [subcopy 2 baris]                                                   │
│                                                                      │
│  [VERIFY YOUR X ↘]   [HOW THE PROOF WORKS ↓]                         │
├───────────────────────┬───────────────────────┬──────────────────────┤
│ 01 // PROVEN     ✓    │ 02 // BOUND      ⛓    │ 03 // PRIVATE    ◇   │
│ Account control       │ Wallet-linked         │ Zero credentials     │
│ [copy]                │ [copy]                │ [copy]               │
│ CLAIM: @handle        │ CONTEXT: 0x…          │ SHARED: NONE         │
├───────────────────────┴───────────────────────┴──────────────────────┤
│  PROOF PIPELINE                                                      │
│  [SIGN] ──▶ [REQUEST] ──▶ [ATTEST] ──▶ [VERIFY] ──▶ [BADGE]         │
│   wallet     zkTLS         TLS claim    server       showcase        │
├──────────────────────────────────┬───────────────────────────────────┤
│  LIVE BADGE PREVIEW              │  WHAT THIS DOES NOT PROVE          │
│  ┌────────────────────────────┐  │  × Token safety or price           │
│  │ $AGNT  Agent Sovereign     │  │  × Creator honesty                 │
│  │ ◆ ZK VERIFIED  @artemis    │  │  × Future account control          │
│  │ 0x89e5…9eba · 2m ago       │  │  × Real-world identity (no KYC)    │
│  │ [INSPECT PROOF ↗]          │  │                                    │
│  └────────────────────────────┘  │  Trust model: Reclaim attestors    │
│                                  │  + TEE attestation. Read more ↗    │
└──────────────────────────────────┴───────────────────────────────────┘
```

**Mobile (<768px):** 3 card jadi stack vertikal; pipeline jadi vertikal dengan garis kiri; badge preview di atas, "does not prove" di bawah. Gutter 16px, tanpa horizontal scroll.

### 8.3 Komponen

**A. `ZkBadge`**

| State | Label | Visual |
|---|---|---|
| `verified` | `◆ ZK VERIFIED @handle` | Aksen penuh, ikon diamond |
| `verified-testnet` | `◆ ZK VERIFIED · TESTNET` | Outline, warna redup |
| `unverified` | `UNVERIFIED SOCIAL` | Abu-abu, tanpa ikon |
| `mismatch` | `⚠ HANDLE MISMATCH` | Warna warning |
| `revoked` | `REVOKED` + tooltip alasan | Coret/strikethrough |

Ukuran: `sm` (Showcase grid), `md` (token page), `lg` (landing preview). Font mono uppercase, letter-spacing sama dengan label existing. Klik → buka `ProofDrawer`.

**B. `ProofDrawer`** (side sheet di desktop, bottom sheet di mobile)

```
ZK PROOF // RECEIPT
─────────────────────────────
Claim         x.com account @handle
Bound wallet  0x1234…abcd ⎘
Token         $AGNT · Robinhood Chain
Session       7f3a…e21c ⎘
Verified      2026-09-23 16:42 UTC+8
Attestation   TEE ✓ · Attestor sig ✓
Status        VALID
─────────────────────────────
[DOWNLOAD proof.json]  [RE-VERIFY]  [EXPLORER ↗]

This proves control of @handle at verification time,
bound to this wallet. It does not prove token safety.
```

**C. `ZkVerifyPanel`** (di Launch Studio, di bawah field X/Twitter)

- Idle: tombol `VERIFY WITH ZK ↘` + teks kecil "Optional · no login shared with Artemis"
- Signing: `State: awaiting wallet signature`
- Proving: QR (desktop) atau tombol buka app (mobile) + `State: generating zkTLS proof`
- Verifying: `State: verifying attestation`
- Success: badge verified + handle otomatis mengisi field X (read-only)
- Error: pesan spesifik (lihat §9.5) + `TRY AGAIN`

Gunakan pola teks `State: …` yang sudah ada di tombol "Confirm & Launch".

**D. Showcase**

- Badge `sm` di setiap card token.
- Filter baru: `ZK VERIFIED ONLY`.
- Sort default tidak berubah (jangan dorong token verified ke atas secara otomatis di v1, agar badge tidak dianggap endorsement).

### 8.4 Motion

- Pipeline: node menyala berurutan saat section masuk viewport (sekali, bukan loop), 300ms per node.
- Badge verified: satu kali shimmer halus saat pertama tampil.
- Hormati `prefers-reduced-motion` → tanpa animasi.

### 8.5 Aksesibilitas

- Badge punya `aria-label` lengkap: "Zero-knowledge verified X account @handle".
- Status jangan hanya dibedakan warna — selalu ada teks/ikon.
- Drawer bisa ditutup dengan Esc, fokus terkunci di dalam.
- Kontras minimal 4.5:1.

---

## 9. Copy

Bahasa situs: **English**. Tone: teknis, singkat, jujur, konsisten dengan copy Artemis.

### 9.1 Section landing page

**Eyebrow:** `07 // ZERO-KNOWLEDGE VERIFICATION`
**Tag kanan:** `zkTLS · LIVE`

**Headline:**
> Prove who launched it.
> Reveal nothing else.

**Subcopy:**
> Creators can prove they control the X account on their launch using zkTLS — no OAuth, no passwords, no data handed to Artemis. Each proof is bound to the deployer wallet and open for anyone to inspect.

**CTA:** `VERIFY YOUR X ↘` · `HOW THE PROOF WORKS ↓`

**Card 01**
- Label: `01 // PROVEN` · Tag: `ACCOUNT CONTROL`
- Title: **Real account, real creator.**
- Body: A zkTLS proof confirms the creator was signed in to the claimed X account at verification time. Spoofed handles fail.
- Footer: `CLAIM: X_ACCOUNT_CONTROL ↘`

**Card 02**
- Label: `02 // BOUND` · Tag: `WALLET CONTEXT`
- Title: **Locked to the deployer.**
- Body: The deployer wallet is written into the proof context. Change one byte and verification fails.
- Footer: `CONTEXT: DEPLOYER_WALLET ↘`

**Card 03**
- Label: `03 // PRIVATE` · Tag: `ZERO CREDENTIALS`
- Title: **Nothing else leaves your session.**
- Body: Artemis never sees your login, cookies, or messages. Only your public handle and the proof are stored.
- Footer: `SHARED: HANDLE_ONLY ↘`

**Pipeline labels:**

| Node | Title | Caption |
|---|---|---|
| 1 | SIGN | Wallet signs a one-time nonce |
| 2 | REQUEST | Artemis issues a zkTLS proof request |
| 3 | ATTEST | Your X session is attested, not shared |
| 4 | VERIFY | Signatures, TEE attestation, freshness, context |
| 5 | BADGE | Public, inspectable, revocable |

**"What this does not prove" panel:**
- Title: **What this does not prove**
- × Token safety, price, or liquidity
- × The creator's intentions
- × That the account stays in the same hands
- × Real-world identity — this is not KYC
- Footnote: *Trust model: proofs are signed by Reclaim Protocol attestors with TEE attestation. Not fully trustless. Read the full model ↗*

### 9.2 Launch Studio

- Field helper (di bawah X / Twitter): `Optional · Verify with zero-knowledge to earn a ZK VERIFIED badge.`
- Tombol: `VERIFY WITH ZK ↘`
- Mikro-copy: `Your X login is never shared with Artemis.`
- Success: `Verified. @handle is now bound to 0x1234…abcd.`

### 9.3 Showcase

- Filter: `ZK VERIFIED ONLY`
- Tooltip badge: `Creator proved control of @handle with zkTLS. Click to inspect the proof.`
- Empty state (filter aktif): `No ZK-verified launches yet. Be the first.`

### 9.4 Tambahan untuk "What We Do Not Hide"

Tambahkan item baru:

> **ZK verification proves an account, not a promise.**
> A ZK VERIFIED badge means the deployer wallet proved control of the listed X account at the time shown. It says nothing about the token's value or the creator's intentions. Proofs rely on Reclaim Protocol attestors and TEE attestation. Artemis stores the public handle, bound wallet, and proof so anyone can inspect them.

Dan revisi item "Client-side custody only":

> …Artemis runs as a client-side interface and API proxy. Private keys and account credentials are never requested, stored, or transmitted. For optional ZK verification, Artemis stores only public handles, wallet addresses, and proofs.

### 9.5 Pesan error

| Kode | Pesan UI |
|---|---|
| `wallet_signature_rejected` | Signature cancelled. No data was saved. |
| `not_deployer` | This wallet didn't deploy this token. Connect the deployer wallet. |
| `handle_mismatch` | Proof is for @{proven}, but the launch lists @{listed}. Update the field or verify the correct account. |
| `stale_proof` | Proof expired. Start a new verification. |
| `unknown_or_used_session` | This proof session is no longer valid. Start again. |
| `invalid_proof` | Proof could not be verified. Try again. |
| `rate_limited` | Too many attempts. Try again in an hour. |

### 9.6 Kata yang DILARANG

Jangan pakai di copy mana pun: *"ZK-secured token"*, *"rug-proof"*, *"fully trustless"*, *"anonymous launch"*, *"ZK-powered launchpad"* (selama hanya verifikasi sosial yang memakai ZK), *"guaranteed"*, *"audited by ZK"*.

Yang boleh: *"ZK-verified creator"*, *"zkTLS proof"*, *"zero-knowledge account verification"*.

---

## 10. Acceptance Criteria

- [ ] Creator bisa menyelesaikan verifikasi di desktop (extension atau QR) dan mobile (App Clip / app).
- [ ] Badge hanya muncul setelah server memverifikasi proof (signature + TEE + freshness + context + session).
- [ ] Proof yang sama dikirim dua kali → ditolak kedua kalinya.
- [ ] Proof dengan context wallet berbeda → ditolak.
- [ ] Wallet non-deployer → ditolak untuk token tersebut.
- [ ] Handle mismatch → pesan jelas, badge tidak muncul.
- [ ] `ProofDrawer` menampilkan semua field dan `proof.json` bisa diunduh.
- [ ] Endpoint re-verify memverifikasi ulang proof tersimpan dan mengembalikan status.
- [ ] Badge testnet berbeda visual dari mainnet.
- [ ] Section landing responsif 360px–1440px tanpa horizontal scroll.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Section ZK di landing page **tidak** di-deploy sebelum semua poin di atas lolos.
- [ ] Copy "What We Do Not Hide" dan "Client-side custody only" sudah diperbarui.
- [ ] APP_SECRET tidak ada di bundle client (cek build output).

---

## 11. Rencana Test

**Unit:** normalisasi handle (case, `@`, spasi), parsing context, cek freshness, verifikasi signature EVM & Solana.

**Integrasi:** flow penuh di Robinhood Testnet dan Solana Devnet dengan akun X test.

**Negatif / keamanan:**
- Replay proof yang sudah dipakai
- Ubah 1 byte context
- Proof dari sessionId buatan sendiri
- Proof > 10 menit
- Wallet lain mencoba memakai handle orang lain
- Spam `/api/zk/init`

**Manual QA:** Chrome + MetaMask, Brave + Phantom, iOS Safari, Android Chrome.

---

## 12. Roadmap Setelah v1

| Fase | Fitur | Catatan |
|---|---|---|
| v1 | ZK Verified Creator (X) | Brief ini |
| v1.1 | Provider tambahan: GitHub (untuk Web3 Developers), Telegram group admin | Reuse pipeline yang sama |
| v2 | Proof of Human anti-bot (Self Protocol / World ID) | Opsional untuk mengurangi spam launch |
| v3 | Onchain attestation registry di Robinhood Chain | Simpan hash proof + handle ke contract registry; badge bisa dibaca dari chain |
| v3+ | Verifier Noir/Circom onchain | Baru pada tahap ini boleh mempertimbangkan klaim yang lebih luas soal "ZK" |

---

## 13. Estimasi

| Pekerjaan | Estimasi |
|---|---|
| Setup Reclaim + provider X | 0.5 hari |
| Backend (nonce, init, callback, status, DB) | 2–3 hari |
| Deployer check EVM + Solana | 1–1.5 hari |
| Frontend: VerifyPanel, Badge, Drawer | 2 hari |
| Showcase integration + filter | 1 hari |
| Section landing page + copy updates | 1.5 hari |
| QA & security testing | 1.5–2 hari |
| **Total** | **±9–11 hari kerja (1 dev fullstack)** |

---

## 14. Referensi

- Reclaim JS SDK — https://github.com/reclaimprotocol/reclaim-js-sdk
- Reclaim Docs (usage & backend verification) — https://docs.reclaimprotocol.org/manual/js-sdk/usage
- Reclaim API reference — https://docs.reclaimprotocol.org/js-sdk/api-reference
- Artemis — https://artemis-olive.vercel.app/

> Selalu cek ulang nama method, opsi `verifyProof` (terutama TEE attestation), dan provider ID di docs Reclaim terbaru sebelum implementasi.
